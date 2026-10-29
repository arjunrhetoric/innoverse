import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Tables: no zebra striping, 1px dividers, optional sticky header, right-aligned
 * numerics. Wrap in a `overflow-x-auto` container on narrow screens (handled by
 * TableWrap) so the page itself never scrolls horizontally.
 */
const TableWrap = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { sticky?: boolean }
>(({ className, sticky, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("w-full overflow-x-auto", sticky && "max-h-[70vh] overflow-y-auto", className)}
    {...props}
  />
));
TableWrap.displayName = "TableWrap";

const Table = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement> & { stickyHead?: boolean }
>(({ className, stickyHead, ...props }, ref) => (
  <table
    ref={ref}
    className={cn("w-full border-collapse text-left text-sm", className)}
    {...props}
    data-sticky-head={stickyHead || undefined}
  />
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-surface-2 [&_tr]:border-b [&_tr]:border-border",
      "sticky top-0 z-10 backdrop-blur-[2px]",
      className
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b border-border transition-colors hover:bg-surface-2/70", className)}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(({ className, numeric, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-9 whitespace-nowrap px-3 py-2 text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground",
      numeric && "text-right",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(({ className, numeric, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-3 py-3 align-middle text-foreground", numeric && "text-right tnum", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("px-3 py-2 text-left text-xs text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableWrap,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
