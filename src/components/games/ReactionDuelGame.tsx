import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';

type Phase = 'idle' | 'waiting' | 'go' | 'roundEnd';

export function ReactionDuelGame() {
  const { isArtDeco } = useAppTheme();
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
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Pemain 1: {wins.p1}</Text>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Pemain 2: {wins.p2}</Text>
      </View>

      {matchWinner ? (
        <View style={styles.center}>
          <Text style={[styles.resultText, isArtDeco && deco.resultText]}>{matchWinner} menang pertandingan! 🎉</Text>
          <GameButton onPress={resetMatch}>Main Lagi</GameButton>
        </View>
      ) : phase === 'idle' ? (
        <View style={styles.center}>
          <Text style={[styles.muted, isArtDeco && deco.muted]}>
            Pegang HP berdua — begitu layar hijau, siapa duluan tap area-nya menang.
          </Text>
          <GameButton onPress={startRound}>Mulai Ronde</GameButton>
        </View>
      ) : (
        <>
          <View style={styles.tapRow}>
            <Pressable
              onPress={() => tap('p1')}
              style={[styles.tapButton, isArtDeco && deco.tapButton, phase === 'go' && styles.tapButtonGo, phase === 'go' && isArtDeco && deco.tapButtonGo]}
            >
              <Text style={[styles.tapLabel, isArtDeco && deco.tapLabel, phase === 'go' && styles.tapLabelGo]}>Pemain 1</Text>
            </Pressable>
            <Pressable
              onPress={() => tap('p2')}
              style={[styles.tapButton, isArtDeco && deco.tapButton, phase === 'go' && styles.tapButtonGo, phase === 'go' && isArtDeco && deco.tapButtonGo]}
            >
              <Text style={[styles.tapLabel, isArtDeco && deco.tapLabel, phase === 'go' && styles.tapLabelGo]}>Pemain 2</Text>
            </Pressable>
          </View>
          <Text style={[styles.muted, isArtDeco && deco.muted]}>
            {phase === 'waiting' && 'Tunggu sampai hijau...'}
            {phase === 'go' && 'TAP SEKARANG!'}
          </Text>
          {phase === 'roundEnd' && (
            <View style={styles.center}>
              <Text style={[styles.text, isArtDeco && deco.text]}>{roundMessage}</Text>
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

const deco = StyleSheet.create({
  muted: {
    color: artDeco.color.muted,
  },
  text: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifBold,
  },
  resultText: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.serifBold,
    letterSpacing: artDeco.letterSpacingWide,
  },
  tapButton: {
    borderRadius: artDeco.radius.none,
    borderWidth: 1.5,
    borderColor: artDeco.color.line,
    backgroundColor: artDeco.color.surface,
  },
  tapButtonGo: {
    backgroundColor: artDeco.color.go,
    borderColor: artDeco.color.goldStrong,
  },
  tapLabel: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifBold,
  },
});
