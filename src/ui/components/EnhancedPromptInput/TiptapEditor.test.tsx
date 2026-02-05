import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TiptapEditor } from './TiptapEditor';
import '@testing-library/jest-dom';

describe('TiptapEditor', () => {
    it('should trigger onSubmit when Enter is pressed and autocomplete is closed', () => {
        const onSubmit = vi.fn();
        const { container } = render(
            <TiptapEditor
                onSubmit={onSubmit}
                isAutocompleteOpen={false}
            />
        );

        // Find the editor content editable area
        const editor = container.querySelector('.ProseMirror');
        expect(editor).toBeTruthy();

        if (editor) {
            fireEvent.keyDown(editor, { key: 'Enter' });
            expect(onSubmit).toHaveBeenCalled();
        }
    });

    // This test is expected to fail or need adjustment after the fix
    // Currently TiptapEditor doesn't know about autocomplete state, so it will submit
    it('should NOT trigger onSubmit when Enter is pressed and autocomplete is open', () => {
        const onSubmit = vi.fn();
        const { container } = render(
            <TiptapEditor
                onSubmit={onSubmit}
                isAutocompleteOpen={true}
            />
        );

        const editor = container.querySelector('.ProseMirror');
        expect(editor).toBeTruthy();

        if (editor) {
            fireEvent.keyDown(editor, { key: 'Enter' });
            // FIXED EXPECTATION: It should NOT call onSubmit
            expect(onSubmit).not.toHaveBeenCalled();
        }
    });
});
