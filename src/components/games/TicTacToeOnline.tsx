import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useOnlineGameSession } from '../../hooks/useOnlineGameSession';
import { useGameScores } from '../../hooks/useGameScores';
import { checkWinner, EMPTY_BOARD, type Cell } from '../../lib/tictactoe';
import { artDeco } from '../../theme/artDecoTokens';
import { useAppTheme } from '../../theme/ThemeContext';
import { GameButton } from './GameButton';
import { GameCard } from './GameCard';
import { TicTacToeBoard } from './TicTacToeBoard';

export function TicTacToeOnline({ coupleId }: { coupleId?: string | null }) {
  const { isArtDeco } = useAppTheme();
  const { data: session, isLoading, userId, startGame, joinGame, updateSession } = useOnlineGameSession(
    coupleId,
    'tictactoe',
    EMPTY_BOARD
  );
  const { recordScore } = useGameScores(coupleId, 'tictactoe');
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);

  if (isLoading) {
    return (
      <GameCard>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Memuat...</Text>
      </GameCard>
    );
  }

  const noActiveGame = !session || session.status === 'finished';

  const handleStart = async () => {
    setStarting(true);
    await startGame();
    setStarting(false);
  };

  if (noActiveGame) {
    return (
      <GameCard>
        {session?.status === 'finished' && (
          <Text style={[styles.text, isArtDeco && deco.text]}>
            {session.winner === 'draw'
              ? 'Game terakhir seri.'
              : `${session.winner === 'x' ? (session.player_x === userId ? 'Kamu' : 'Pasangan') : session.player_o === userId ? 'Kamu' : 'Pasangan'} menang di game terakhir.`}
          </Text>
        )}
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Belum ada game aktif. Mulai satu untuk main bareng pasangan.</Text>
        <GameButton onPress={handleStart} loading={starting}>
          Mulai Game Baru
        </GameButton>
      </GameCard>
    );
  }

  const isPlayerX = session.player_x === userId;
  const waitingForPartner = !session.player_o && !isPlayerX;
  const waitingForOpponentToJoin = !session.player_o && isPlayerX;

  const handleJoin = async () => {
    setJoining(true);
    await joinGame(session.id);
    setJoining(false);
  };

  if (waitingForPartner) {
    return (
      <GameCard>
        <Text style={[styles.text, isArtDeco && deco.text]}>Pasangan membuat game baru. Gabung yuk!</Text>
        <GameButton onPress={handleJoin} loading={joining}>
          Gabung sebagai Pemain 2
        </GameButton>
      </GameCard>
    );
  }

  if (waitingForOpponentToJoin) {
    return (
      <GameCard>
        <Text style={[styles.muted, isArtDeco && deco.muted]}>Menunggu pasangan bergabung ke game ini...</Text>
      </GameCard>
    );
  }

  const mySymbol: Cell = isPlayerX ? 'x' : 'o';
  const isMyTurn = session.turn === userId;
  const result = session.winner;
  const board = session.state as Cell[];

  async function handleCellClick(index: number) {
    if (!session) return;
    const next = [...board];
    next[index] = mySymbol;
    const outcome = checkWinner(next);
    const nextTurn = isPlayerX ? session.player_o : session.player_x;

    await updateSession({
      id: session.id,
      state: next,
      turn: outcome ? null : nextTurn,
      winner: outcome,
      status: outcome ? 'finished' : 'active',
    });

    if (outcome) {
      const winnerUserId = outcome === 'draw' ? null : outcome === mySymbol ? userId : nextTurn;
      await recordScore({ winnerUserId });
    }
  }

  return (
    <GameCard>
      <Text style={[styles.muted, isArtDeco && deco.muted]}>
        Kamu bermain sebagai <Text style={[styles.bold, isArtDeco && deco.bold]}>{mySymbol === 'x' ? '✕' : '○'}</Text>
      </Text>

      <TicTacToeBoard board={board} disabled={!isMyTurn || !!result} onCellClick={handleCellClick} />

      <View style={styles.footer}>
        {result ? (
          <Text style={[styles.resultText, isArtDeco && deco.resultText]}>
            {result === 'draw' ? 'Seri!' : result === mySymbol ? 'Kamu menang! 🎉' : 'Pasangan menang.'}
          </Text>
        ) : (
          <Text style={[styles.muted, isArtDeco && deco.muted]}>
            {isMyTurn ? 'Giliran kamu' : 'Menunggu giliran pasangan...'}
          </Text>
        )}
        {result && (
          <GameButton variant="secondary" onPress={handleStart} loading={starting}>
            Main Lagi
          </GameButton>
        )}
      </View>
    </GameCard>
  );
}

const styles = StyleSheet.create({
  muted: {
    fontSize: 13,
    color: '#767676',
    textAlign: 'center',
  },
  text: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  bold: {
    fontWeight: '700',
    color: '#333',
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
});

const deco = StyleSheet.create({
  muted: {
    color: artDeco.color.muted,
  },
  text: {
    color: artDeco.color.ink,
  },
  bold: {
    color: artDeco.color.gold,
    fontFamily: artDeco.font.serifBold,
  },
  resultText: {
    color: artDeco.color.ink,
    fontFamily: artDeco.font.serifBold,
  },
});
