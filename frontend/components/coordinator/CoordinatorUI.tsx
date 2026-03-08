"use client";

import { ReactNode } from "react";
import type { ApplicationStatus, DocumentReviewStatus, EmployeeSubmissionStatus, CallStatus } from "@/types/call";

interface StatusBadgeProps {
  status: ApplicationStatus | DocumentReviewStatus | EmployeeSubmissionStatus | CallStatus | string;
  type?: 'application' | 'document' | 'submission' | 'call';
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  // Application statuses
  pending: { label: 'En attente', color: 'gray' },
  submitted: { label: 'Soumise', color: 'blue' },
  under_review: { label: 'En examen', color: 'yellow' },
  additional_info_requested: { label: 'Info demandée', color: 'orange' },
  approved: { label: 'Approuvée', color: 'green' },
  rejected: { label: 'Rejetée', color: 'red' },
  withdrawn: { label: 'Retirée', color: 'gray' },
  // Document statuses
  requires_resubmission: { label: 'À resoumettre', color: 'orange' },
  // Call statuses
  draft: { label: 'Brouillon', color: 'gray' },
  published: { label: 'Publié', color: 'green' },
  closed: { label: 'Fermé', color: 'yellow' },
  results_published: { label: 'Résultats publiés', color: 'blue' },
};

const COLOR_CLASSES: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function StatusBadge({ status, type = 'application', size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'gray' };
  const colorClass = COLOR_CLASSES[config.color] || COLOR_CLASSES.gray;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${colorClass} ${sizeClass}`}>
      {config.label}
    </span>
  );
}

// Reusable Stat Card Component
interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  onClick?: () => void;
}

export function StatCard({ title, value, icon, trend, trendUp, onClick }: StatCardProps) {
  const Wrapper = onClick ? 'button' : 'div';
  
  return (
    <Wrapper
      onClick={onClick}
      className={`card-elevated p-6 transition-all duration-300 ${
        onClick ? 'hover:border-primary-500/30 cursor-pointer text-left w-full' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trendUp ? 'text-emerald-500' : 'text-muted-foreground'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="icon-box w-12 h-12">
          {icon}
        </div>
      </div>
    </Wrapper>
  );
}

// Confirm Dialog Component
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'primary',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const buttonVariants = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    warning: 'bg-orange-600 hover:bg-orange-700 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="relative bg-card rounded-2xl shadow-elevated border border-border max-w-md w-full p-6 animate-fade-up">
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{message}</p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${buttonVariants[variant]}`}
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary inline-flex items-center gap-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Loading Skeleton Components
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="h-12 bg-muted rounded-lg animate-pulse" />
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card-elevated p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded w-24 animate-pulse" />
          <div className="h-8 bg-muted rounded w-16 animate-pulse" />
        </div>
        <div className="w-12 h-12 bg-muted rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

// Search Input Component
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher...' }: SearchInputProps) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input pl-10 w-full"
      />
    </div>
  );
}

// Filter Select Component
interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function FilterSelect({ value, onChange, options, placeholder = 'Tous' }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="form-input appearance-none cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = [];
  const showEllipsis = totalPages > 7;
  
  if (showEllipsis) {
    if (currentPage <= 3) {
      for (let i = 1; i <= Math.min(5, totalPages); i++) pages.push(i);
      if (totalPages > 5) pages.push('...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...');
      for (let i = Math.max(totalPages - 4, 2); i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
  } else {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      {pages.map((page, idx) => (
        <button
          key={idx}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === '...'}
          className={`min-w-[40px] h-10 rounded-lg text-sm font-medium transition-colors ${
            page === currentPage
              ? 'bg-primary-600 text-white'
              : page === '...'
              ? 'text-muted-foreground cursor-default'
              : 'text-foreground hover:bg-muted'
          }`}
        >
          {page}
        </button>
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
