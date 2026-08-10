import { useCallback, useEffect, useState } from 'react';

import { friendlyError } from '../lib/friendlyError';
import { supabase } from '../lib/supabase';
import type { WishlistItem } from '../types/database';

export function useWishlist(coupleId: string | null) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!coupleId) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(friendlyError(fetchError.message));
    } else {
      setItems((data as WishlistItem[]) ?? []);
      setError(null);
    }
    setLoading(false);
  }, [coupleId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleDone = useCallback(
    async (item: WishlistItem) => {
      const { error: updateError } = await supabase
        .from('wishlist_items')
        .update({ is_done: !item.is_done })
        .eq('id', item.id);
      if (updateError) {
        setError(friendlyError(updateError.message));
        return;
      }
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_done: !i.is_done } : i))
      );
    },
    []
  );

  const promoteToGoal = useCallback(async (item: WishlistItem) => {
    if (!coupleId) return;
    const { data: userData } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from('couple_goals').insert({
      couple_id: coupleId,
      title: item.title,
      description: item.description,
      linked_wishlist_item_id: item.id,
      is_done: false,
      created_by: userData.user?.id ?? null,
    });

    if (insertError) {
      setError(friendlyError(insertError.message));
      return false;
    }
    return true;
  }, [coupleId]);

  return { items, loading, error, refresh, toggleDone, promoteToGoal };
}
