import { useCallback, useEffect, useState } from 'react';

import { friendlyError } from '../lib/friendlyError';
import { supabase } from '../lib/supabase';
import type { WishlistItem } from '../types/database';

export function useWishlist(coupleId: string | null) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  // Which wishlist items already have a linked couple_goals row -- derived
  // from actual server data, not just "did I successfully promote one this
  // session". A component-local Set for this alone reset on every fresh
  // mount (e.g. app restart, or the modal being remounted), so a
  // previously-promoted item's button would show "Jadikan goal" again and
  // re-promoting it inserted a second, duplicate couple_goals row with no
  // de-duplication anywhere in the stack.
  const [promotedIds, setPromotedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!coupleId) return;
    setLoading(true);
    const [{ data, error: fetchError }, { data: goalsData }] = await Promise.all([
      supabase
        .from('wishlist_items')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false }),
      supabase
        .from('couple_goals')
        .select('linked_wishlist_item_id')
        .eq('couple_id', coupleId)
        .not('linked_wishlist_item_id', 'is', null),
    ]);

    if (fetchError) {
      setError(friendlyError(fetchError.message));
    } else {
      setItems((data as WishlistItem[]) ?? []);
      setError(null);
    }
    setPromotedIds(new Set((goalsData ?? []).map((g) => g.linked_wishlist_item_id as string)));
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
    if (!coupleId) return false;

    // Guards against the app-restart/remount case above -- doesn't fully
    // close a true concurrent-insert race (two taps landing at the exact
    // same instant), but that's a far narrower window than "any time the
    // component remounts" and matches the reported failure mode.
    const { data: existing } = await supabase
      .from('couple_goals')
      .select('id')
      .eq('linked_wishlist_item_id', item.id)
      .maybeSingle();
    if (existing) {
      setPromotedIds((prev) => new Set(prev).add(item.id));
      return true;
    }

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
    setPromotedIds((prev) => new Set(prev).add(item.id));
    return true;
  }, [coupleId]);

  return { items, promotedIds, loading, error, refresh, toggleDone, promoteToGoal };
}
