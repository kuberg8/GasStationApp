import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import { AuthScreen } from '../AuthScreen';
import { Button, Notice } from '../ui';
const endpoints = { api: 'https://twitter.example', socket: 'wss://twitter.example' };
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
let tree: renderer.ReactTestRenderer;
afterEach(async () => {
  await act(async () => tree?.unmount());
});
async function fill(label: string, value: string) {
  await act(async () =>
    tree.root
      .findAllByType(TextInput)
      .find((field) => field.props.accessibilityLabel === label)!
      .props.onChangeText(value),
  );
}
test('validates input and logs into the existing account without a second session store', async () => {
  const onLogin = jest.fn().mockResolvedValue(undefined);
  globalThis.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ token: 'token', user_id: 'alice' }),
    });
  await act(async () => {
    tree = renderer.create(
      <AuthScreen endpoints={endpoints} onLogin={onLogin} onSettings={() => {}} message="" />,
    );
  });
  await act(async () => tree.root.findAllByType(Button)[0].props.onPress());
  expect(globalThis.fetch).not.toHaveBeenCalled();
  expect(tree.root.findByType(Notice).props.text).toBe('Заполните все поля.');
  await fill('Электронная почта', 'alice@example.com');
  await fill('Пароль', 'password');
  await act(async () => tree.root.findAllByType(Button)[0].props.onPress());
  expect(onLogin).toHaveBeenCalledWith({ token: 'token', user_id: 'alice' });
});
test('failed sign-in displays the backend error and allows retry', async () => {
  globalThis.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: 'Неверный логин или пароль' }),
    });
  await act(async () => {
    tree = renderer.create(
      <AuthScreen endpoints={endpoints} onLogin={jest.fn()} onSettings={() => {}} message="" />,
    );
  });
  await fill('Электронная почта', 'alice@example.com');
  await fill('Пароль', 'wrong');
  await act(async () => tree.root.findAllByType(Button)[0].props.onPress());
  expect(tree.root.findByType(Notice).props.text).toBe('Неверный логин или пароль');
  expect(tree.root.findAllByType(Button)[0].props.busy).toBe(false);
});
