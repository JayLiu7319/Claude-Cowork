import {
    Root as DialogRoot,
    Portal as DialogPortal,
    Overlay as DialogOverlay,
    Content as DialogContent,
    Title as DialogTitle,
    Close as DialogClose,
    Description as DialogDescription
} from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import type { DeleteDialogProps } from "../types";

/**
 * Confirmation dialog for deleting a session
 */
export function DeleteDialog({ sessionId, onClose, onConfirm }: DeleteDialogProps) {
    const { t } = useTranslation();

    return (
        <DialogRoot open={!!sessionId} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 overscroll-contain" />
                <DialogContent className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl z-50">
                    <DialogTitle className="text-lg font-semibold text-ink-800">
                        {t("sidebar.deleteSession", "删除会话")}
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-sm text-muted">
                        {t("sidebar.deleteConfirmation", "您确定要删除此会话吗？此操作无法撤销。")}
                    </DialogDescription>
                    <div className="mt-6 flex justify-end gap-3">
                        <DialogClose asChild>
                            <button className="rounded-xl px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-900/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                                {t("common.cancel", "取消")}
                            </button>
                        </DialogClose>
                        <button
                            className="rounded-xl bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2"
                            onClick={onConfirm}
                        >
                            {t("common.delete", "删除")}
                        </button>
                    </div>
                </DialogContent>
            </DialogPortal>
        </DialogRoot>
    );
}
