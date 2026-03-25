'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { createRentCycle } from '../actions'
import { createClient } from '@/utils/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface Member {
    user_id: string
    name: string
}

interface CreateRentCyclePageProps {
    params: Promise<{ id: string }>
}

export default function CreateRentCyclePage({ params }: CreateRentCyclePageProps) {
    const router = useRouter()
    const [houseId, setHouseId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [memberAmounts, setMemberAmounts] = useState<Record<string, number>>({})
    const [totalAmount, setTotalAmount] = useState(0)
    const [splitEvenly, setSplitEvenly] = useState(true)

    useEffect(() => {
        params.then(p => {
            setHouseId(p.id)
            loadMembers(p.id)
        })
    }, [params])

    async function loadMembers(houseId: string) {
        const supabase = createClient()
        const { data } = await supabase
            .from('house_members')
            .select(`
                user_id,
                profiles:user_id (
                    name
                )
            `)
            .eq('house_id', houseId)
            .eq('status', 'active')

        if (data) {
            const memberList = data.map((m: any) => ({
                user_id: m.user_id,
                name: m.profiles?.name || 'Unknown',
            }))
            setMembers(memberList)
            
            // Initialize amounts
            const amounts: Record<string, number> = {}
            memberList.forEach(m => {
                amounts[m.user_id] = 0
            })
            setMemberAmounts(amounts)
        }
    }

    function handleTotalChange(value: number) {
        setTotalAmount(value)
        if (splitEvenly && members.length > 0) {
            const perPerson = Math.round((value / members.length) * 100) / 100
            const amounts: Record<string, number> = {}
            members.forEach(m => {
                amounts[m.user_id] = perPerson
            })
            setMemberAmounts(amounts)
        }
    }

    function handleMemberAmountChange(userId: string, value: number) {
        setMemberAmounts(prev => ({ ...prev, [userId]: value }))
        setSplitEvenly(false)
    }

    function calculateTotal() {
        return Object.values(memberAmounts).reduce((sum, amt) => sum + amt, 0)
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        
        // Add member amounts as JSON
        const amounts = Object.entries(memberAmounts).map(([user_id, amount]) => ({
            user_id,
            amount,
        }))
        formData.set('member_amounts', JSON.stringify(amounts))

        const result = await createRentCycle(houseId, formData)

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            router.push(`/houses/${houseId}/rent`)
        }
    }

    if (!houseId) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
    }

    const assignedTotal = calculateTotal()
    const difference = totalAmount - assignedTotal

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName="User" />

            <main className="max-w-3xl mx-auto py-8 px-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href="/houses" className="hover:text-gray-700">Houses</Link>
                    <span>/</span>
                    <Link href={`/houses/${houseId}`} className="hover:text-gray-700">House</Link>
                    <span>/</span>
                    <Link href={`/houses/${houseId}/rent`} className="hover:text-gray-700">Rent</Link>
                    <span>/</span>
                    <span className="text-gray-900">Create Cycle</span>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Rent Cycle</h1>
                    <p className="text-gray-600 mb-6">Set up a new rent payment period</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cycle Name
                            </label>
                            <input
                                name="name"
                                type="text"
                                required
                                placeholder="e.g., March 2026 Rent"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date
                                </label>
                                <input
                                    name="start_date"
                                    type="date"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Due Date
                                </label>
                                <input
                                    name="due_date"
                                    type="date"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Total Rent Amount
                            </label>
                            <input
                                name="total_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={totalAmount || ''}
                                onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        </div>

                        {/* Member Amounts */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    Member Amounts
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={splitEvenly}
                                        onChange={(e) => {
                                            setSplitEvenly(e.target.checked)
                                            if (e.target.checked) {
                                                handleTotalChange(totalAmount)
                                            }
                                        }}
                                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    Split evenly
                                </label>
                            </div>

                            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                {members.map(member => (
                                    <div key={member.user_id} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{member.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={memberAmounts[member.user_id] || ''}
                                                onChange={(e) => handleMemberAmountChange(member.user_id, parseFloat(e.target.value) || 0)}
                                                className="w-28 px-3 py-1.5 border border-gray-300 rounded text-right text-sm"
                                            />
                                        </div>
                                    </div>
                                ))}

                                <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                                    <span className="font-medium text-gray-900">Assigned Total</span>
                                    <span className={`font-semibold ${Math.abs(difference) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatCurrency(assignedTotal)}
                                        {Math.abs(difference) > 0.01 && (
                                            <span className="text-sm ml-2">
                                                ({difference > 0 ? '-' : '+'}{formatCurrency(Math.abs(difference))})
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes (optional)
                            </label>
                            <textarea
                                name="notes"
                                rows={3}
                                placeholder="Any additional notes about this rent cycle..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading || Math.abs(difference) > 0.01}
                                className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create Rent Cycle'}
                            </button>
                            <Link
                                href={`/houses/${houseId}/rent`}
                                className="px-6 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}
