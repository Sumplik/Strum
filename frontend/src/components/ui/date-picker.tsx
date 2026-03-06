import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[150px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex justify-center gap-2 p-2 border-b">
          <select
            value={displayMonth.getMonth()}
            onChange={(e) => handleMonthChange(parseInt(e.target.value))}
            className="rounded border px-2 py-1 text-sm bg-background"
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
            className="rounded border px-2 py-1 text-sm bg-background"
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
          className="p-3"
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
  fromPlaceholder = "From",
  toPlaceholder = "To",
  disabled = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [displayMonth, setDisplayMonth] = React.useState(from || new Date());

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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[260px] justify-start text-left font-normal",
            (!from || !to) && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {from ? (to ? `${format(from, "dd/MM/yyyy")} - ${format(to, "dd/MM/yyyy")}` : format(from, "dd/MM/yyyy")) : (to ? format(to, "dd/MM/yyyy") : `${fromPlaceholder} - ${toPlaceholder}`)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex justify-center gap-2 p-2 border-b">
          <select
            value={displayMonth.getMonth()}
            onChange={(e) => handleMonthChange(parseInt(e.target.value))}
            className="rounded border px-2 py-1 text-sm bg-background"
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
            className="rounded border px-2 py-1 text-sm bg-background"
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
          mode="range"
          selected={{ from, to }}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          onSelect={(selectedRange) => {
            onSelect(selectedRange?.from, selectedRange?.to);
            if (selectedRange?.from) {
              setDisplayMonth(selectedRange.from);
            }
            if (selectedRange?.from && selectedRange?.to) {
              setIsOpen(false);
            }
          }}
          disabled={disabled}
          showOutsideDays
          numberOfMonths={2}
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
}

