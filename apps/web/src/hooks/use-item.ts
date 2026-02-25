"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ItemListResponse,
  ItemOut,
  UpdateItemRequest,
} from "@momentarise/shared";
import { itemListResponseSchema, itemOutSchema } from "@momentarise/shared";
import { fetchWithAuth } from "@/lib/bff-client";

export function useItems() {
  return useQuery<ItemListResponse>({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/items");
      if (!res.ok) throw new Error("Failed to fetch items");
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
      if (!res.ok) throw new Error("Failed to fetch item");
      const data = await res.json();
      return itemOutSchema.parse(data) as ItemOut;
    },
    enabled: !!itemId,
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
      if (previous && payload.blocks !== undefined) {
        queryClient.setQueryData<ItemOut>(["item", itemId], {
          ...previous,
          blocks: payload.blocks,
          ...(payload.title !== undefined && { title: payload.title }),
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
    },
  });
}
