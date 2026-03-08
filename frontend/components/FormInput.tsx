"use client";

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  /** Label text displayed above the input */
  label?: string;
  /** Icon rendered on the left side of the input */
  leftIcon?: ReactNode;
  /** Error message — adds red border and shows error text below */
  error?: string;
  /** Extra wrapper className */
  wrapperClassName?: string;
  /** Makes the label required with an asterisk */
  isRequired?: boolean;
}

/**
 * Reusable form input component with consistent styling.
 * Handles left icons, password toggle, error states, and labels.
 *
 * Usage:
 * ```tsx
 * <FormInput
 *   label="Email"
 *   leftIcon={<Mail className="w-5 h-5" />}
 *   type="email"
 *   placeholder="votre@email.com"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   error={errors.email}
 *   isRequired
 * />
 * ```
 */
export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      leftIcon,
      error,
      wrapperClassName = "",
      isRequired = false,
      type,
      ...inputProps
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    const hasLeft = !!leftIcon;
    const hasRight = isPassword;

    const inputClasses = [
      "form-input",
      hasLeft && "pl-10",
      hasRight && "pr-12",
      error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={`space-y-2 ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputProps.id}
            className="block text-sm font-medium text-foreground"
          >
            {label}
            {isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            type={inputType}
            className={inputClasses}
            {...inputProps}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
              tabIndex={-1}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";
