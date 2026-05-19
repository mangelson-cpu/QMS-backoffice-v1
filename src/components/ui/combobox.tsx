import React, { createContext, useContext, useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import "./combobox.css";

interface ComboboxContextProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  items: any[];
  filteredItems: any[];
  selectedValue: any;
  handleSelect: (value: any) => void;
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  placeholder?: string;
  itemToString: (item: any) => string;
  itemToValue: (item: any) => any;
  inputRef: React.RefObject<HTMLInputElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const ComboboxContext = createContext<ComboboxContextProps | null>(null);

export const useCombobox = () => {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error("useCombobox must be used within a <Combobox> component");
  }
  return context;
};

const defaultItemToString = (item: any): string => {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    return item.nom || item.nom_filiale || item.name || item.label || JSON.stringify(item);
  }
  return String(item);
};

const defaultItemToValue = (item: any): any => {
  if (item === null || item === undefined) return "";
  if (typeof item === "object" && item.id !== undefined) return item.id;
  return item;
};

export const Combobox = ({
  items,
  value,
  onChange,
  itemToString = defaultItemToString,
  itemToValue = defaultItemToValue,
  children,
  placeholder,
  style,
  className = "",
}: {
  items: readonly any[] | any[];
  value?: any;
  onChange?: (value: any) => void;
  itemToString?: (item: any) => string;
  itemToValue?: (item: any) => any;
  children: React.ReactNode;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fermer le dropdown lors d'un clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Déterminer le libellé actuellement sélectionné
  const selectedLabel = useMemo(() => {
    if (value === undefined || value === null || value === "") return "";
    const match = items.find((item) => {
      const itemVal = itemToValue(item);
      return itemVal === value || item === value;
    });
    return match ? itemToString(match) : (typeof value === "string" ? value : "");
  }, [value, items, itemToString, itemToValue]);

  // Si le dropdown se ferme, le champ recherche revient au libellé sélectionné
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(selectedLabel);
      setActiveIndex(-1);
    }
  }, [isOpen, selectedLabel]);

  // Filtrer les éléments
  const filteredItems = useMemo(() => {
    if (!isOpen) return items as any[];
    // Si la recherche correspond exactement au libellé sélectionné, on montre tout
    if (searchTerm.toLowerCase().trim() === selectedLabel.toLowerCase().trim()) {
      return items as any[];
    }
    return items.filter((item) => {
      const label = itemToString(item);
      return label.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [items, searchTerm, selectedLabel, isOpen, itemToString]);

  const handleSelect = (item: any) => {
    const val = itemToValue(item);
    if (onChange) {
      onChange(val);
    }
    setSearchTerm(itemToString(item));
    setIsOpen(false);
  };

  const valueContext = {
    searchTerm,
    setSearchTerm,
    isOpen,
    setIsOpen,
    items: items as any[],
    filteredItems,
    selectedValue: value,
    handleSelect,
    activeIndex,
    setActiveIndex,
    placeholder,
    itemToString,
    itemToValue,
    inputRef,
    containerRef,
  };

  return (
    <ComboboxContext.Provider value={valueContext}>
      <div className={`combobox-container ${className}`} ref={containerRef} style={style}>
        {children}
      </div>
    </ComboboxContext.Provider>
  );
};

export const ComboboxInput = ({
  placeholder,
  className = "",
  leftIcon,
  disabled,
  style,
}: {
  placeholder?: string;
  className?: string;
  leftIcon?: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}) => {
  const {
    searchTerm,
    setSearchTerm,
    isOpen,
    setIsOpen,
    filteredItems,
    handleSelect,
    activeIndex,
    setActiveIndex,
    inputRef,
  } = useCombobox();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev: number) => (prev + 1) % Math.max(1, filteredItems.length));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev: number) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredItems.length) {
          handleSelect(filteredItems[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="combobox-input-wrapper">
      {leftIcon && <div className="combobox-left-icon">{leftIcon}</div>}
      <input
        ref={inputRef}
        type="text"
        className={`combobox-input ${leftIcon ? "has-left-icon" : ""} ${className}`}
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => {
          if (disabled) return;
          setSearchTerm(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => !disabled && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        style={style}
      />
      <div className={`combobox-chevron ${isOpen ? "open" : ""}`} onClick={() => !disabled && setIsOpen(!isOpen)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
};

export const ComboboxContent = ({
  children,
  style,
  className = "",
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) => {
  const { isOpen, containerRef } = useCombobox();
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const updateCoords = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };

    updateCoords();
    
    // Listen to scroll events in capture phase so we catch scroll inside tables
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);

    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen, containerRef]);

  if (!isOpen || !coords) return null;

  return createPortal(
    <div
      className={`combobox-content ${className}`}
      style={{
        position: "absolute",
        top: `${coords.top + 6}px`,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        zIndex: 9999,
        ...style,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export const ComboboxEmpty = ({ children }: { children: React.ReactNode }) => {
  const { filteredItems } = useCombobox();
  if (filteredItems.length > 0) return null;
  return <div className="combobox-empty">{children}</div>;
};

export const ComboboxList = ({
  children,
  style,
  className = "",
}: {
  children: (item: any, index: number) => React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) => {
  const { filteredItems } = useCombobox();
  if (filteredItems.length === 0) return null;
  return (
    <div className={`combobox-list ${className}`} style={style}>
      {filteredItems.map((item, index) => children(item, index))}
    </div>
  );
};

export const ComboboxItem = ({
  value,
  children,
  index,
  style,
  className = "",
}: {
  value: any;
  children: React.ReactNode;
  index?: number;
  style?: React.CSSProperties;
  className?: string;
}) => {
  const { selectedValue, handleSelect, activeIndex, setActiveIndex, itemToValue } = useCombobox();
  const val = itemToValue(value);
  const isSelected = selectedValue === val || value === selectedValue;
  const isActive = activeIndex === index;

  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isActive]);

  return (
    <div
      ref={itemRef}
      className={`combobox-item ${isSelected ? "selected" : ""} ${isActive ? "active" : ""} ${className}`}
      onClick={() => handleSelect(value)}
      onMouseEnter={() => index !== undefined && setActiveIndex(index)}
      style={style}
    >
      <span className="combobox-item-text">{children}</span>
      {isSelected && (
        <span className="combobox-item-check">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </div>
  );
};
