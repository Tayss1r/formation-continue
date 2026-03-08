"use client";

import { forwardRef, InputHTMLAttributes, ReactNode, useState } from "react";
import { Eye, EyeOff, LucideIcon } from "lucide-react";

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  rightElement?: ReactNode;
  showPasswordToggle?: boolean;
  containerClassName?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      icon: Icon,
      error,
      hint,
      rightElement,
      showPasswordToggle,
      containerClassName = "",
      type = "text",
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = showPasswordToggle ? (showPassword ? "text" : "password") : type;

    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none">
              <Icon className="w-[18px] h-[18px] text-muted-foreground" />
            </div>
          )}
          <input
            ref={ref}
            id={id}
            type={inputType}
            className={`
              w-full h-12 
              ${Icon ? 'pl-11' : 'pl-4'}
              ${showPasswordToggle || rightElement ? 'pr-11' : 'pr-4'}
              bg-card
              border rounded-xl
              text-[15px] text-foreground
              placeholder:text-muted-foreground
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-border hover:border-primary-300 dark:hover:border-primary-700'
              }
            `}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 bottom-0 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-[18px] h-[18px]" />
              ) : (
                <Eye className="w-[18px] h-[18px]" />
              )}
            </button>
          )}
          {rightElement && !showPasswordToggle && (
            <div className="absolute right-0 top-0 bottom-0 w-11 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
        {hint && !error && (
          <p className="text-sm text-muted-foreground mt-1">{hint}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

export default FormInput;

// Textarea variant
interface FormTextareaProps extends Omit<InputHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  rows?: number;
  containerClassName?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      label,
      icon: Icon,
      error,
      hint,
      rows = 3,
      containerClassName = "",
      id,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-0 top-0 h-12 w-11 flex items-center justify-center pointer-events-none">
              <Icon className="w-[18px] h-[18px] text-muted-foreground" />
            </div>
          )}
          <textarea
            ref={ref}
            id={id}
            rows={rows}
            className={`
              w-full min-h-[100px]
              ${Icon ? 'pl-11' : 'pl-4'}
              pr-4 py-3
              bg-card
              border rounded-xl
              text-[15px] text-foreground leading-relaxed
              placeholder:text-muted-foreground
              transition-all duration-200
              resize-none
              focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-border hover:border-primary-300 dark:hover:border-primary-700'
              }
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
        {hint && !error && (
          <p className="text-sm text-muted-foreground mt-1">{hint}</p>
        )}
      </div>
    );
  }
);

FormTextarea.displayName = "FormTextarea";

// File upload component
interface FileUploadProps {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  accept?: string;
  onChange: (file: File | null) => void;
  value?: File | null;
  required?: boolean;
  containerClassName?: string;
}

export function FileUpload({
  label,
  icon: Icon,
  error,
  hint,
  accept = ".pdf,.jpg,.jpeg,.png",
  onChange,
  value,
  required,
  containerClassName = "",
}: FileUploadProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onChange(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      onChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          relative flex flex-col items-center justify-center
          w-full min-h-[120px] p-4
          border-2 border-dashed rounded-xl
          cursor-pointer
          transition-all duration-200
          ${error 
            ? 'border-red-400 bg-red-50/50 dark:bg-red-900/10' 
            : value 
              ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10'
              : 'border-border hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10'
          }
        `}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="sr-only"
        />
        {Icon && (
          <Icon className={`w-8 h-8 mb-2 ${value ? 'text-green-500' : 'text-muted-foreground'}`} />
        )}
        {value ? (
          <div className="text-center">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              Fichier sélectionné
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
              {value.name}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onChange(null);
              }}
              className="text-xs text-red-500 hover:text-red-600 mt-2"
            >
              Supprimer
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-primary-600 dark:text-primary-400">
                Cliquez pour télécharger
              </span>{" "}
              ou glissez-déposez
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, JPG ou PNG (max 10MB)
            </p>
          </div>
        )}
      </label>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
      {hint && !error && (
        <p className="text-sm text-muted-foreground mt-1">{hint}</p>
      )}
    </div>
  );
}
