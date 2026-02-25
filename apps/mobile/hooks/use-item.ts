import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ItemListResponse,
  ItemOut,
  UpdateItemRequest,
} from "@momentarise/shared";
import { itemListResponseSchema, itemOutSchema } from "@momentarise/shared";
import { apiFetch } from "@/lib/api";

export function useItems() {
  return useQuery<ItemListResponse>({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/items");
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
      const res = await apiFetch(`/api/v1/items/${itemId}`);
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
      const res = await apiFetch(`/api/v1/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update item");
      const data = await res.json();
      return itemOutSchema.parse(data) as ItemOut;
    },
    onSuccess: (updatedItem) => {
      if (itemId) {
        queryClient.setQueryData(["item", itemId], updatedItem);
      }
    },
  });
}
