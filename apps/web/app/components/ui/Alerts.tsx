'use client'

import { useState, useEffect } from 'react'

interface ErrorAlertProps {
    message: string
    onDismiss?: () => void
    autoHide?: boolean
    autoHideDelay?: number
}

export function ErrorAlert({ 
    message, 
    onDismiss, 
    autoHide = false,
    autoHideDelay = 5000 
}: ErrorAlertProps) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        if (autoHide) {
            const timer = setTimeout(() => {
                setVisible(false)
                onDismiss?.()
            }, autoHideDelay)
            return () => clearTimeout(timer)
        }
    }, [autoHide, autoHideDelay, onDismiss])

    if (!visible) return null

    return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
                <span className="text-red-500 text-xl">⚠️</span>
                <div className="flex-1">
                    <p className="text-red-800">{message}</p>
                </div>
                {onDismiss && (
                    <button
                        onClick={() => {
                            setVisible(false)
                            onDismiss()
                        }}
                        className="text-red-500 hover:text-red-700"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    )
}

interface SuccessAlertProps {
    message: string
    onDismiss?: () => void
    autoHide?: boolean
    autoHideDelay?: number
}

export function SuccessAlert({ 
    message, 
    onDismiss, 
    autoHide = true,
    autoHideDelay = 3000 
}: SuccessAlertProps) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        if (autoHide) {
            const timer = setTimeout(() => {
                setVisible(false)
                onDismiss?.()
            }, autoHideDelay)
            return () => clearTimeout(timer)
        }
    }, [autoHide, autoHideDelay, onDismiss])

    if (!visible) return null

    return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✓</span>
                <div className="flex-1">
                    <p className="text-green-800">{message}</p>
                </div>
                {onDismiss && (
                    <button
                        onClick={() => {
                            setVisible(false)
                            onDismiss()
                        }}
                        className="text-green-500 hover:text-green-700"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    )
}

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    text?: string
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    }

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className={`${sizeClasses[size]} border-2 border-blue-600 border-t-transparent rounded-full animate-spin`}></div>
            {text && <p className="mt-2 text-gray-600 text-sm">{text}</p>}
        </div>
    )
}

interface EmptyStateProps {
    icon?: string
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
    return (
        <div className="text-center py-12">
            <div className="text-5xl mb-4">{icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            {description && <p className="text-gray-600 mb-4 max-w-md mx-auto">{description}</p>}
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    {action.label}
                </button>
            )}
        </div>
    )
}

interface ConfirmDialogProps {
    isOpen: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    onCancel: () => void
    variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'danger'
}: ConfirmDialogProps) {
    if (!isOpen) return null

    const variantStyles = {
        danger: 'bg-red-600 hover:bg-red-700',
        warning: 'bg-yellow-600 hover:bg-yellow-700',
        info: 'bg-blue-600 hover:bg-blue-700',
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-white rounded-lg ${variantStyles[variant]}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
