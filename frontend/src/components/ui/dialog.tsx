import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

export const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { variant?: "dialog" | "drawer" }>(
  ({ className, children, variant = "dialog", ...props }, ref) => <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="dialog-overlay" />
    <DialogPrimitive.Content ref={ref} className={cn("dialog-content", variant === "drawer" && "dialog-drawer", className)} {...props}>
      {children}
      <DialogPrimitive.Close asChild>
        <Button variant="ghost" size="icon" className="dialog-close" aria-label="Close dialog"><X aria-hidden="true" /></Button>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>,
)
DialogContent.displayName = "DialogContent"
