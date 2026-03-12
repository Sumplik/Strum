import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

export interface DatePickerProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({
  date,
  onSelect,
  className,
  placeholder = "Select date",
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [displayMonth, setDisplayMonth] = React.useState(date || new Date());

  const handleMonthChange = (month: number) => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(month);
    setDisplayMonth(newDate);
  };

  const handleYearChange = (year: number) => {
    const newDate = new Date(displayMonth);
    newDate.setFullYear(year);
    setDisplayMonth(newDate);
  };

  // Custom classNames for better readability (larger fonts, more spacing)
  const calendarClassNames = {
    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
    month: "space-y-4",
    caption: "flex justify-center pt-1 relative items-center",
    caption_label: "text-base font-semibold px-2",
    nav: "space-x-1 flex items-center",
    nav_button: "h-10 w-10 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-muted rounded-md transition-all",
    nav_button_previous: "absolute left-1",
    nav_button_next: "absolute right-1",
    table: "w-full border-collapse space-y-1",
    head_row: "flex",
    head_cell: "text-sm font-semibold text-muted-foreground rounded-md w-11 py-3",
    row: "flex w-full mt-2",
    cell: "text-base text-center p-0 relative focus-within:relative focus-within:z-20",
    day: "h-11 w-11 p-0 font-medium hover:bg-accent hover:text-accent-foreground rounded-lg transition-all text-base",
    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg font-semibold",
    day_today: "border-2 border-primary font-bold rounded-lg",
    day_outside: "text-muted-foreground opacity-40",
    day_disabled: "text-muted-foreground opacity-30 line-through",
    day_hidden: "invisible",
  };

  const components = {
    ChevronLeft: () => (
      <ChevronLeft className="h-5 w-5" />
    ),
    ChevronRight: () => (
      <ChevronRight className="h-5 w-5" />
    ),
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[160px] sm:w-[180px] justify-start text-left font-normal text-base",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-5 w-5" />
          {date ? format(date, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 bg-white dark:bg-[var(--popover)]" align="start" sideOffset={8}>
        {/* Month/Year Selector - Larger and more readable */}
        <div className="flex justify-center gap-2 p-2 mb-2 border-b bg-white dark:bg-[var(--popover)] rounded-lg">
          <select
            value={displayMonth.getMonth()}
            onChange={(e) => handleMonthChange(parseInt(e.target.value))}
            className="rounded-lg border-2 px-3 py-2 text-base font-medium bg-white dark:bg-[var(--secondary)] cursor-pointer hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {format(new Date(2000, i, 1), "MMMM")}
              </option>
            ))}
          </select>
          <select
            value={displayMonth.getFullYear()}
            onChange={(e) => handleYearChange(parseInt(e.target.value))}
            className="rounded-lg border-2 px-3 py-2 text-base font-medium bg-white dark:bg-[var(--secondary)] cursor-pointer hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Array.from({ length: 20 }, (_, i) => {
              const year = new Date().getFullYear() - 5 + i;
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
        <DayPicker
          mode="single"
          selected={date}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          onSelect={(selectedDate) => {
            onSelect(selectedDate);
            if (selectedDate) {
              setDisplayMonth(selectedDate);
            }
            setIsOpen(false);
          }}
          disabled={disabled}
          showOutsideDays
          classNames={calendarClassNames as DayPickerProps["classNames"]}
          components={components as DayPickerProps["components"]}
          className="p-2 bg-white dark:bg-[var(--popover)]"
        />
      </PopoverContent>
    </Popover>
  );
}

export interface DateRangePickerProps {
  from: Date | undefined;
  to: Date | undefined;
  onSelect: (from: Date | undefined, to: Date | undefined) => void;
  className?: string;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  from,
  to,
  onSelect,
  className,
  fromPlaceholder = "Dari",
  toPlaceholder = "Sampai",
  disabled = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Internal state for the two pickers
  const [fromDate, setFromDate] = React.useState<Date>(from || new Date());
  const [toDate, setToDate] = React.useState<Date>(to || new Date());

  // Update internal state when props change
  React.useEffect(() => {
    if (from) setFromDate(from);
  }, [from]);

  React.useEffect(() => {
    if (to) setToDate(to);
  }, [to]);

  const handleApply = () => {
    onSelect(fromDate, toDate);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[260px] sm:w-[300px] justify-start text-left font-normal text-base",
            (!from || !to) && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-5 w-5" />
          {from ? (to ? `${format(from, "dd/MM/yyyy")} - ${format(to, "dd/MM/yyyy")}` : format(from, "dd/MM/yyyy")) : (to ? format(to, "dd/MM/yyyy") : `${fromPlaceholder} - ${toPlaceholder}`)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 bg-white dark:bg-[var(--popover)]" align="start" sideOffset={8}>
        <div className="flex flex-col gap-4">
          {/* Label dan 2 DatePicker terpisah */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground font-medium">{fromPlaceholder}</span>
              <DatePicker
                date={fromDate}
                onSelect={(date) => date && setFromDate(date)}
                className="w-[160px]"
              />
            </div>
            <span className="text-muted-foreground mt-6">-</span>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground font-medium">{toPlaceholder}</span>
              <DatePicker
                date={toDate}
                onSelect={(date) => date && setToDate(date)}
                className="w-[160px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// MonthYearPicker - For selecting month and year range (for monthly trends)
export interface MonthYearPickerProps {
  fromMonth: Date | undefined;
  toMonth: Date | undefined;
  onSelect: (fromMonth: Date | undefined, toMonth: Date | undefined) => void;
  className?: string;
  fromPlaceholder?: string;
  toPlaceholder?: string;
  disabled?: boolean;
}

export function MonthYearPicker({
  fromMonth,
  toMonth,
  onSelect,
  className,
  fromPlaceholder = "Dari bulan",
  toPlaceholder = "Sampai bulan",
  disabled = false,
}: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Internal state for the two pickers
  const [fromDate, setFromDate] = React.useState<Date>(fromMonth || new Date());
  const [toDate, setToDate] = React.useState<Date>(toMonth || new Date());

  // Update internal state when props change
  React.useEffect(() => {
    if (fromMonth) setFromDate(fromMonth);
  }, [fromMonth]);

  React.useEffect(() => {
    if (toMonth) setToDate(toMonth);
  }, [toMonth]);

  const handleApply = () => {
    onSelect(fromDate, toDate);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[260px] sm:w-[300px] justify-start text-left font-normal text-base",
            (!fromMonth || !toMonth) && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-5 w-5" />
          {fromMonth ? (toMonth ? `${format(fromMonth, "MMM yyyy")} - ${format(toMonth, "MMM yyyy")}` : format(fromMonth, "MMM yyyy")) : (toMonth ? format(toMonth, "MMM yyyy") : `${fromPlaceholder} - ${toPlaceholder}`)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 bg-white dark:bg-[var(--popover)]" align="start" sideOffset={8}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground font-medium">{fromPlaceholder}</span>
              <DatePicker
                date={fromDate}
                onSelect={(date) => date && setFromDate(date)}
                className="w-[160px]"
              />
            </div>
            <span className="text-muted-foreground mt-6">-</span>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground font-medium">{toPlaceholder}</span>
              <DatePicker
                date={toDate}
                onSelect={(date) => date && setToDate(date)}
                className="w-[160px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

