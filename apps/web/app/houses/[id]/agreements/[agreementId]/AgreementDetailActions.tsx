'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { activateAgreement, acceptAgreement, archiveAgreement } from '../actions'

interface Agreement {
    id: string
    status: string
    title: string
}

interface AgreementDetailActionsProps {
    agreement: Agreement
    isAdmin: boolean
    hasAccepted: boolean
    houseId: string
}

export default function AgreementDetailActions({ agreement, isAdmin, hasAccepted, houseId }: AgreementDetailActionsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    async function handleActivate() {
        if (!confirm('Activate this agreement? All members will need to accept it.')) return
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
        } else {
            router.push(`/houses/${houseId}/agreements`)
        }
        setLoading(false)
    }

    return (
        <div className="flex items-center gap-2">
            {agreement.status === 'active' && !hasAccepted && (
                <button
                    onClick={handleAccept}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                    Accept Agreement
                </button>
            )}

            {isAdmin && agreement.status === 'draft' && (
                <>
                    <button
                        onClick={handleActivate}
                        disabled={loading}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
                    >
                        Activate
                    </button>
                    <a
                        href={`/houses/${houseId}/agreements/${agreement.id}/edit`}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                    >
                        Edit
                    </a>
                </>
            )}

            {isAdmin && (agreement.status === 'draft' || agreement.status === 'active') && (
                <button
                    onClick={handleArchive}
                    disabled={loading}
                    className="px-4 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                    Archive
                </button>
            )}
        </div>
    )
}
