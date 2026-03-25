'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { activateAgreement, acceptAgreement, archiveAgreement } from './actions'

interface Agreement {
    id: string
    status: string
    title: string
}

interface AgreementActionsProps {
    agreement: Agreement
    isAdmin: boolean
    hasAccepted: boolean
    houseId: string
}

export default function AgreementActions({ agreement, isAdmin, hasAccepted, houseId }: AgreementActionsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    async function handleActivate() {
        setLoading(true)
        const result = await activateAgreement(agreement.id)
        if (result.error) {
            alert(result.error)
        }
        setLoading(false)
        router.refresh()
    }

    async function handleAccept() {
        setLoading(true)
        const result = await acceptAgreement(agreement.id)
        if (result.error) {
            alert(result.error)
        }
        setLoading(false)
        router.refresh()
    }

    async function handleArchive() {
        if (!confirm('Are you sure you want to archive this agreement?')) return
        setLoading(true)
        const result = await archiveAgreement(agreement.id)
        if (result.error) {
            alert(result.error)
        }
        setLoading(false)
        router.refresh()
    }

    return (
        <div className="flex items-center gap-2">
            {agreement.status === 'active' && !hasAccepted && (
                <button
                    onClick={handleAccept}
                    disabled={loading}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                    Accept
                </button>
            )}

            {isAdmin && agreement.status === 'draft' && (
                <>
                    <button
                        onClick={handleActivate}
                        disabled={loading}
                        className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50"
                    >
                        Activate
                    </button>
                    <a
                        href={`/houses/${houseId}/agreements/${agreement.id}/edit`}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                    >
                        Edit
                    </a>
                </>
            )}

            {isAdmin && (agreement.status === 'draft' || agreement.status === 'active') && (
                <button
                    onClick={handleArchive}
                    disabled={loading}
                    className="px-3 py-1.5 text-gray-500 text-sm hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                    Archive
                </button>
            )}
        </div>
    )
}
