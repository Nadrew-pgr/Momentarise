"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateEntityLinkRequest,
  ItemActionResponse,
  ItemCreateRequest,
  ItemLinksResponse,
  ItemListResponse,
  ItemOut,
  UpdateItemRequest,
} from "@momentarise/shared";
import {
  createEntityLinkRequestSchema,
  entityLinkSchema,
  itemActionResponseSchema,
  itemCreateRequestSchema,
  itemLinksResponseSchema,
  itemListResponseSchema,
  itemOutSchema,
} from "@momentarise/shared";
import { fetchWithAuth } from "@/lib/bff-client";

async function readWebError(res: Response, fallback: string): Promise<string> {
  const base = `${fallback} (${res.status})`;
  const contentType = res.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const payload = (await res.json()) as Record<string, unknown>;
      const detail =
        typeof payload.detail === "string"
          ? payload.detail
          : typeof payload.message === "string"
            ? payload.message
            : null;
      return detail ? `${base}: ${detail}` : base;
    }
    const text = (await res.text()).trim();
    return text ? `${base}: ${text.slice(0, 200)}` : base;
  } catch {
    return base;
  }
}

export function useItems() {
  return useQuery<ItemListResponse>({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/items");
      if (!res.ok) throw new Error(await readWebError(res, "Failed to fetch items"));
      const data = await res.json();
      return itemListResponseSchema.parse(data) as ItemListResponse;
    },
  });
}

export function useItem(itemId: string | null) {
  return useQuery<ItemOut | null>({
    queryKey: ["item", itemId],
    queryFn: async () => {
      if (!itemId) return null;
      const res = await fetchWithAuth(`/api/items/${itemId}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(await readWebError(res, "Failed to fetch item"));
      const data = await res.json();
      return itemOutSchema.parse(data) as ItemOut;
    },
    enabled: !!itemId,
    retry: false,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ItemCreateRequest) => {
      const body = itemCreateRequestSchema.parse(payload);
      const res = await fetchWithAuth("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create item");
      const data = await res.json();
      return itemOutSchema.parse(data) as ItemOut;
    },
    onSuccess: (item) => {
      queryClient.setQueryData(["item", item.id], item);
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useUpdateItem(itemId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateItemRequest) => {
      if (!itemId) throw new Error("No item id");
      const res = await fetchWithAuth(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update item");
      const data = await res.json();
      return itemOutSchema.parse(data) as ItemOut;
    },
    onMutate: async (payload) => {
      if (!itemId) return undefined;
      await queryClient.cancelQueries({ queryKey: ["item", itemId] });
      const previous = queryClient.getQueryData<ItemOut>(["item", itemId]);
      if (previous) {
        const optimisticBlocks =
          payload.blocks !== undefined
            ? (payload.blocks as unknown as ItemOut["blocks"])
            : undefined;
        queryClient.setQueryData<ItemOut>(["item", itemId], {
          ...previous,
          ...(optimisticBlocks !== undefined && { blocks: optimisticBlocks }),
          ...(payload.title !== undefined && { title: payload.title }),
          ...(payload.kind !== undefined && { kind: payload.kind }),
          ...(payload.status !== undefined && { status: payload.status }),
          ...(payload.metadata !== undefined && { metadata: payload.metadata }),
        });
      }
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous && itemId) {
        queryClient.setQueryData(["item", itemId], context.previous);
      }
    },
    onSuccess: (updatedItem) => {
      if (itemId) {
        queryClient.setQueryData(["item", itemId], updatedItem);
      }
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useDeleteItem(itemId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!itemId) throw new Error("No item id");
      const res = await fetchWithAuth(`/api/items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete item");
      const data = await res.json();
      return itemActionResponseSchema.parse(data) as ItemActionResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useDeleteItemById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      const res = await fetchWithAuth(`/api/items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete item");
      const data = await res.json();
      return itemActionResponseSchema.parse(data) as ItemActionResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["item"] });
    },
  });
}

export function useRestoreItem(itemId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!itemId) throw new Error("No item id");
      const res = await fetchWithAuth(`/api/items/${itemId}/restore`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to restore item");
      const data = await res.json();
      return itemActionResponseSchema.parse(data) as ItemActionResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item", itemId] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useRestoreItemById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      const res = await fetchWithAuth(`/api/items/${itemId}/restore`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to restore item");
      const data = await res.json();
      return itemActionResponseSchema.parse(data) as ItemActionResponse;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["item", variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useItemLinks(itemId: string | null) {
  return useQuery<ItemLinksResponse>({
    queryKey: ["item-links", itemId],
    enabled: !!itemId,
    queryFn: async () => {
      if (!itemId) return { links: [] };
      const res = await fetchWithAuth(`/api/items/${itemId}/links`);
      if (res.status === 404) return { links: [] } as ItemLinksResponse;
      if (!res.ok) throw new Error("Failed to fetch links");
      const data = await res.json();
      return itemLinksResponseSchema.parse(data) as ItemLinksResponse;
    },
    retry: false,
  });
}

export function useCreateItemLink(itemId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEntityLinkRequest) => {
      if (!itemId) throw new Error("No item id");
      const body = createEntityLinkRequestSchema.parse(payload);
      const res = await fetchWithAuth(`/api/items/${itemId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create link");
      const data = await res.json();
      return entityLinkSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-links", itemId] });
    },
  });
}
