import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { AccountRequired } from '../components/AccountRequired';

export default function CreateAccountScreen() {
  const navigation = useNavigation<any>();
  return (
    <AccountRequired
      icon="sparkles-outline"
      title="Create your free account"
      message="Keep your wardrobe safe, and buy, sell and share looks with the ModTok community."
      onDone={() => (navigation.canGoBack() ? navigation.goBack() : undefined)}
    />
  );
}
