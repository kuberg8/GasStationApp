import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import RootLayout from '../../../app/_layout';
import { useAuth } from '../AuthProvider';
import { loadEndpoints, loadSession, saveSession } from '../storage';

jest.mock('../storage', () => ({
  loadEndpoints: jest.fn(),
  loadSession: jest.fn(),
  saveSession: jest.fn(),
  saveEndpoints: jest.fn(),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true] }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-reanimated', () => ({}));
jest.mock('../ServerSettings', () => ({ ServerSettings: () => null }));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-router/react-navigation', () => ({
  ThemeProvider: ({ children }: any) => children,
}));
let mockAuth: ReturnType<typeof useAuth>;
jest.mock('expo-router', () => {
  const React = require('react');
  const Stack = ({ children }: any) => {
    mockAuth = require('../AuthProvider').useAuth();
    return <>{children}</>;
  };
  Stack.Screen = (props: any) => React.createElement('Route', props);
  Stack.Protected = ({ guard, children }: any) => (guard ? children : null);
  return { Stack };
});
let tree: renderer.ReactTestRenderer;
const endpoints = { api: 'http://test', socket: 'ws://test' };
const session = { token: 'token', user_id: 'alice' };
beforeEach(() => {
  jest.mocked(loadEndpoints).mockResolvedValue(endpoints);
  jest.mocked(loadSession).mockResolvedValue(null);
  jest.mocked(saveSession).mockResolvedValue(undefined);
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  jest.restoreAllMocks();
});
const routes = () => tree.root.findAllByType('Route' as any).map((route) => route.props.name);
test('all tabs are protected until sign-in and removed again on logout', async () => {
  await act(async () => {
    tree = renderer.create(<RootLayout />);
  });
  expect(routes()).toEqual(['sign-in']);
  await act(async () => mockAuth.login(session));
  expect(routes()).toEqual(['(tabs)', '+not-found']);
  const alert = jest.spyOn(Alert, 'alert');
  act(() => mockAuth.logout());
  await act(async () => alert.mock.calls[0][2]![1].onPress!());
  expect(routes()).toEqual(['sign-in']);
  expect(saveSession).toHaveBeenLastCalledWith(null, endpoints);
});
test('restores the shared session and gates tabs again when it expires', async () => {
  jest.mocked(loadSession).mockResolvedValue(session);
  await act(async () => {
    tree = renderer.create(<RootLayout />);
  });
  expect(routes()).toContain('(tabs)');
  await act(async () => mockAuth.expired());
  expect(routes()).toEqual(['sign-in']);
  expect(mockAuth.error).toContain('Сессия истекла');
});
