"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"

const TabsMotionContext = React.createContext({ animated: false, value: undefined as string | undefined, switched: false })

function Tabs({
  className,
  orientation = "horizontal",
  animated = false,
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & { animated?: boolean }) {
  const [selectedValue, setSelectedValue] = React.useState(defaultValue)
  const [switched, setSwitched] = React.useState(false)
  return (
    <TabsMotionContext.Provider value={{ animated: animated && orientation === "horizontal", value: value ?? selectedValue, switched }}>
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => {
        if (animated) { setSelectedValue(next); setSwitched(true) }
        onValueChange?.(next)
      }}
      {...props}
    />
    </TabsMotionContext.Provider>
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 motion-reduce:transition-none",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity motion-reduce:after:transition-none group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100 motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  value,
  style,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const motion = React.useContext(TabsMotionContext)
  const inactive = motion.animated && motion.value !== value
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      value={value}
      className={cn("flex-1 text-sm outline-none", className, motion.animated && "absolute inset-0 h-full w-full min-w-0 flex-none overflow-hidden motion-reduce:filter-none! motion-reduce:transition-none", motion.animated && motion.switched && "transition-[opacity,filter] duration-200 ease-in-out")}
      style={motion.animated ? { ...style, opacity: inactive ? 0 : 1, filter: inactive ? "blur(2px)" : "blur(0px)", zIndex: inactive ? 0 : 1 } : style}
      {...props}
      forceMount={motion.animated ? true : props.forceMount}
      inert={motion.animated ? inactive : props.inert}
      aria-hidden={motion.animated ? inactive : props["aria-hidden"]}
    />
  )
}

function TabsContents({ className, children, ...props }: React.ComponentProps<"div">) {
  const motion = React.useContext(TabsMotionContext)
  return <div data-slot="tabs-contents" className={cn("relative min-h-0 flex-1", motion.animated && "overflow-hidden", className)} {...props}>{children}</div>
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsContents, tabsListVariants }
