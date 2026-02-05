/**
 * Tests for questionSignature utility functions
 */
import { describe, it, expect } from 'vitest';
import { getAskUserQuestionSignature } from './questionSignature';
import type { AskUserQuestionInput } from '../types';

describe('getAskUserQuestionSignature', () => {
    describe('edge cases - empty/invalid input', () => {
        it('should return empty string for undefined input', () => {
            expect(getAskUserQuestionSignature(undefined)).toBe('');
        });

        it('should return empty string for null input', () => {
            expect(getAskUserQuestionSignature(null)).toBe('');
        });

        it('should return empty string for empty object', () => {
            expect(getAskUserQuestionSignature({})).toBe('');
        });

        it('should return empty string for empty questions array', () => {
            expect(getAskUserQuestionSignature({ questions: [] })).toBe('');
        });
    });

    describe('single question', () => {
        it('should generate signature for simple question without options', () => {
            const input: AskUserQuestionInput = {
                questions: [{ question: 'Do you want to continue?' }]
            };
            expect(getAskUserQuestionSignature(input)).toBe('Do you want to continue?||0|');
        });

        it('should include header in signature', () => {
            const input: AskUserQuestionInput = {
                questions: [{
                    question: 'Select an option',
                    header: 'Configuration'
                }]
            };
            expect(getAskUserQuestionSignature(input)).toBe('Select an option|Configuration|0|');
        });

        it('should mark multiSelect as 1', () => {
            const input: AskUserQuestionInput = {
                questions: [{
                    question: 'Select items',
                    multiSelect: true
                }]
            };
            expect(getAskUserQuestionSignature(input)).toBe('Select items||1|');
        });

        it('should include options with labels', () => {
            const input: AskUserQuestionInput = {
                questions: [{
                    question: 'Choose one',
                    options: [
                        { label: 'Yes' },
                        { label: 'No' }
                    ]
                }]
            };
            expect(getAskUserQuestionSignature(input)).toBe('Choose one||0|Yes|,No|');
        });

        it('should include options with labels and descriptions', () => {
            const input: AskUserQuestionInput = {
                questions: [{
                    question: 'Choose one',
                    options: [
                        { label: 'Yes', description: 'Confirm the action' },
                        { label: 'No', description: 'Cancel the action' }
                    ]
                }]
            };
            expect(getAskUserQuestionSignature(input)).toBe('Choose one||0|Yes|Confirm the action,No|Cancel the action');
        });
    });

    describe('multiple questions', () => {
        it('should separate questions with double pipe', () => {
            const input: AskUserQuestionInput = {
                questions: [
                    { question: 'First question' },
                    { question: 'Second question' }
                ]
            };
            expect(getAskUserQuestionSignature(input)).toBe('First question||0|||Second question||0|');
        });

        it('should handle complex multiple questions', () => {
            const input: AskUserQuestionInput = {
                questions: [
                    {
                        question: 'Select mode',
                        header: 'Mode Selection',
                        options: [{ label: 'Auto' }, { label: 'Manual' }]
                    },
                    {
                        question: 'Select features',
                        multiSelect: true,
                        options: [{ label: 'Feature A' }, { label: 'Feature B' }]
                    }
                ]
            };
            const signature = getAskUserQuestionSignature(input);
            expect(signature).toContain('Select mode|Mode Selection|0|Auto|,Manual|');
            expect(signature).toContain('||Select features||1|Feature A|,Feature B|');
        });
    });

    describe('signature uniqueness', () => {
        it('should generate different signatures for different questions', () => {
            const input1: AskUserQuestionInput = {
                questions: [{ question: 'Question A' }]
            };
            const input2: AskUserQuestionInput = {
                questions: [{ question: 'Question B' }]
            };
            expect(getAskUserQuestionSignature(input1)).not.toBe(getAskUserQuestionSignature(input2));
        });

        it('should generate same signature for identical inputs', () => {
            const input1: AskUserQuestionInput = {
                questions: [{
                    question: 'Same question',
                    header: 'Same header',
                    multiSelect: true,
                    options: [{ label: 'Same', description: 'Desc' }]
                }]
            };
            const input2: AskUserQuestionInput = {
                questions: [{
                    question: 'Same question',
                    header: 'Same header',
                    multiSelect: true,
                    options: [{ label: 'Same', description: 'Desc' }]
                }]
            };
            expect(getAskUserQuestionSignature(input1)).toBe(getAskUserQuestionSignature(input2));
        });
    });
});
