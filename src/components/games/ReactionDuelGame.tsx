import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

type Phase = 'idle' | 'waiting' | 'go' | 'roundEnd';

export function ReactionDuelGame() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [wins, setWins] = useState({ p1: 0, p2: 0 });
  const [roundMessage, setRoundMessage] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  function startRound() {
    setPhase('waiting');
    setRoundMessage('');
    const delay = 1200 + Math.random() * 2800;
    timeoutRef.current = setTimeout(() => setPhase('go'), delay);
  }

  function tap(player: 'p1' | 'p2') {
    if (phase === 'waiting') {
      clearTimeout(timeoutRef.current);
      const other = player === 'p1' ? 'p2' : 'p1';
      setWins((w) => ({ ...w, [other]: w[other] + 1 }));
      setRoundMessage(`${player === 'p1' ? 'Pemain 1' : 'Pemain 2'} tap kecepetan! Poin buat lawan.`);
      setPhase('roundEnd');
      return;
    }
    if (phase === 'go') {
      setWins((w) => ({ ...w, [player]: w[player] + 1 }));
      setRoundMessage(`${player === 'p1' ? 'Pemain 1' : 'Pemain 2'} menang ronde ini!`);
      setPhase('roundEnd');
    }
  }

  const matchWinner = wins.p1 >= 3 ? 'Pemain 1' : wins.p2 >= 3 ? 'Pemain 2' : null;

  function resetMatch() {
    clearTimeout(timeoutRef.current);
    setWins({ p1: 0, p2: 0 });
    setPhase('idle');
    setRoundMessage('');
  }

  return (
    <GameCard>
      <View style={styles.scoreRow}>
        <Text style={styles.muted}>Pemain 1: {wins.p1}</Text>
        <Text style={styles.muted}>Pemain 2: {wins.p2}</Text>
      </View>

      {matchWinner ? (
        <View style={styles.center}>
          <Text style={styles.resultText}>{matchWinner} menang pertandingan! 🎉</Text>
          <GameButton onPress={resetMatch}>Main Lagi</GameButton>
        </View>
      ) : phase === 'idle' ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Pegang HP berdua — begitu layar hijau, siapa duluan tap area-nya menang.</Text>
          <GameButton onPress={startRound}>Mulai Ronde</GameButton>
        </View>
      ) : (
        <>
          <View style={styles.tapRow}>
            <Pressable onPress={() => tap('p1')} style={[styles.tapButton, phase === 'go' && styles.tapButtonGo]}>
              <Text style={[styles.tapLabel, phase === 'go' && styles.tapLabelGo]}>Pemain 1</Text>
            </Pressable>
            <Pressable onPress={() => tap('p2')} style={[styles.tapButton, phase === 'go' && styles.tapButtonGo]}>
              <Text style={[styles.tapLabel, phase === 'go' && styles.tapLabelGo]}>Pemain 2</Text>
            </Pressable>
          </View>
          <Text style={styles.muted}>
            {phase === 'waiting' && 'Tunggu sampai hijau...'}
            {phase === 'go' && 'TAP SEKARANG!'}
          </Text>
          {phase === 'roundEnd' && (
            <View style={styles.center}>
              <Text style={styles.text}>{roundMessage}</Text>
              <GameButton variant="secondary" onPress={startRound}>
                Ronde Berikutnya
              </GameButton>
            </View>
          )}
        </>
      )}
    </GameCard>
  );
}

const styles = StyleSheet.create({
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  muted: {
    fontSize: 13,
    color: '#767676',
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  center: {
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  tapRow: {
    flexDirection: 'row',
    height: 180,
    gap: 8,
  },
  tapButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#fdeef4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapButtonGo: {
    backgroundColor: '#22c55e',
  },
  tapLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  tapLabelGo: {
    color: '#fff',
  },
});
