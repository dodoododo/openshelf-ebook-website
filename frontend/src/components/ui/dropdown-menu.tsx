import * as Menu from "@radix-ui/react-dropdown-menu"
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react"
import { cn } from "@/lib/utils"

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger
export const DropdownMenuLabel = Menu.Label
export const DropdownMenuSeparator = Menu.Separator

export const DropdownMenuContent = forwardRef<ElementRef<typeof Menu.Content>, ComponentPropsWithoutRef<typeof Menu.Content>>(
  ({ className, sideOffset = 8, ...props }, ref) => <Menu.Portal>
    <Menu.Content ref={ref} sideOffset={sideOffset} className={cn("dropdown-content", className)} {...props} />
  </Menu.Portal>,
)
DropdownMenuContent.displayName = "DropdownMenuContent"

export const DropdownMenuItem = forwardRef<ElementRef<typeof Menu.Item>, ComponentPropsWithoutRef<typeof Menu.Item>>(
  ({ className, ...props }, ref) => <Menu.Item ref={ref} className={cn("dropdown-item", className)} {...props} />,
)
DropdownMenuItem.displayName = "DropdownMenuItem"
