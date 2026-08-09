export type RootStackParamList = {
  SignIn: undefined;
  Home: undefined;
  Arcade: { coupleId: string };
  Game: { gameKey: string; coupleId: string };
};
