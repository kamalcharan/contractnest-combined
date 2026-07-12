// src/navigation/types.ts
import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: { prefillEmail?: string } | undefined;
  InvitationSignup: undefined;
  RegisterInfo: undefined;
};

export type MainTabsParamList = {
  Home: undefined;
  Contacts: undefined;
  Hub: undefined;
  Money: undefined;
  Ops: { segment?: 'cockpit' | 'cadence' } | undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabsParamList>;
  ContactDetail: { id: string };
  ContactForm: { id?: string } | undefined;
  Appearance: undefined;
};
