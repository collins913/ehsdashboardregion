"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react"

const TabsListMotionContext = React.createContext({ id: "", variant: "default" as "default" | "line" })

const TabsAutoHeightContext = React.createContext(false)

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
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => {
        setSelectedValue(next); setSwitched(true)
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
  const id = React.useId()
  return (
    <TabsListMotionContext.Provider value={{ id, variant: variant ?? "default" }}>
      <LayoutGroup id={id}>
        <TabsPrimitive.List
          data-slot="tabs-list"
          data-variant={variant}
          className={cn(tabsListVariants({ variant }), className)}
          {...props}
        />
      </LayoutGroup>
    </TabsListMotionContext.Provider>
  )
}

function TabsTrigger({
  className,
  value,
  children,
  asChild = false,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const selection = React.useContext(TabsMotionContext)
  const list = React.useContext(TabsListMotionContext)
  const reducedMotion = useReducedMotion()
  const active = selection.value === value
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      asChild={asChild}
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground  group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 motion-reduce:transition-none",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:text-foreground dark:data-active:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity motion-reduce:after:transition-none group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5  motion-reduce:transition-none",
        asChild && "group-data-[variant=default]/tabs-list:data-active:shadow-sm data-active:bg-background dark:data-active:border-input dark:data-active:bg-input/30 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    >
      {asChild ? children : <>
      {active ? <motion.span
        data-slot="tabs-active-indicator"
        aria-hidden="true"
        initial={false}
        layoutId={`${list.id}-active`}
        className={list.variant === "line"
          ? "pointer-events-none absolute inset-x-0 bottom-[-5px] h-0.5 bg-foreground group-data-vertical/tabs:inset-x-auto group-data-vertical/tabs:inset-y-0 group-data-vertical/tabs:-right-1 group-data-vertical/tabs:h-auto group-data-vertical/tabs:w-0.5"
          : "pointer-events-none absolute inset-0 rounded-md border border-transparent bg-background shadow-sm dark:border-input dark:bg-input/30"}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
      /> : null}
      <span className="relative inline-flex items-center justify-center gap-1.5">{children}</span>
      </>}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  value,
  style,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const selection = React.useContext(TabsMotionContext)
  const autoHeight = React.useContext(TabsAutoHeightContext)
  const fixedAnimation = selection.animated && !autoHeight
  const managed = fixedAnimation || autoHeight
  const inactive = managed && selection.value !== value
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      value={value}
      className={cn("flex-1 text-sm outline-none", className, fixedAnimation && "absolute inset-0 h-full w-full min-w-0 flex-none overflow-hidden motion-reduce:filter-none! motion-reduce:transition-none", fixedAnimation && selection.switched && "transition-[opacity,filter] duration-200 ease-in-out")}
      style={fixedAnimation ? { ...style, opacity: inactive ? 0 : 1, filter: inactive ? "blur(2px)" : "blur(0px)", zIndex: inactive ? 0 : 1 } : style}
      {...props}
      forceMount={managed ? true : props.forceMount}
      inert={managed ? inactive : props.inert}
      aria-hidden={managed ? inactive : props["aria-hidden"]}
    />
  )
}

function TabsContents({ className, children, mode = "fixed", ...props }: React.ComponentProps<"div"> & { mode?: "fixed" | "auto-height" }) {
  const selection = React.useContext(TabsMotionContext)
  const reducedMotion = useReducedMotion()
  const autoHeight = selection.animated && mode === "auto-height"
  const selectedPanel = autoHeight ? React.Children.toArray(children).find((child) =>
    React.isValidElement<{ value?: string }>(child) && child.props.value === selection.value) : null
  return (
    <TabsAutoHeightContext.Provider value={autoHeight}>
      <div data-slot="tabs-contents" data-mode={mode} className={cn("relative min-h-0 flex-1", selection.animated && "overflow-hidden", className)} {...props}>
        {autoHeight ? <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={selection.value}
            initial={reducedMotion ? false : { opacity: 0, filter: "blur(2px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: reducedMotion ? "blur(0px)" : "blur(2px)" }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeInOut" }}
          >{selectedPanel}</motion.div>
        </AnimatePresence> : children}
      </div>
    </TabsAutoHeightContext.Provider>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsContents, tabsListVariants }
