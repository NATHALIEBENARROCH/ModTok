import React from 'react';
import { InputAccessoryView, Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing } from '../theme';

// iOS number and price keypads have no return key, so people had to tap behind the keypad to
// close it. Give a TextInput `inputAccessoryViewID={KEYBOARD_DONE_ID}` and render
// <KeyboardDoneBar /> once on the screen to show a "Done" bar above the keypad.
export const KEYBOARD_DONE_ID = 'modtok-keyboard-done';

export default function KeyboardDoneBar() {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View style={styles.bar}>
        <TouchableOpacity
          onPress={() => Keyboard.dismiss()}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Done, close keyboard"
        >
          <Text style={styles.done}>Done</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    backgroundColor: '#F2F2F4',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C8C8CC',
  },
  done: {
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '600',
  },
});
