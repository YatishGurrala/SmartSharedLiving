import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { getStatusColor, formatDate } from '@/lib/utils'
import AgreementActions from './AgreementActions'

interface AgreementsPageProps {
    params: Promise<{ id: string }>
}

export default async function AgreementsPage({ params }: AgreementsPageProps) {
    const { id: houseId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    // Check membership
    const { data: membership } = await supabase
        .from('house_members')
        .select('role')
        .eq('house_id', houseId)
        .eq('user_id', user.id)
        .single()

    if (!membership) redirect('/houses')

    const isAdmin = membership.role === 'admin'

    // Get house details
    const { data: house } = await supabase
        .from('houses')
        .select('city')
        .eq('id', houseId)
        .single()

    // Get profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

    // Get agreements
    const { data: agreements } = await supabase
        .from('agreements')
        .select(`
            *,
            profiles:created_by (
                name
            )
        `)
        .eq('house_id', houseId)
        .order('created_at', { ascending: false })

    // Get member count
    const { count: memberCount } = await supabase
        .from('house_members')
        .select('*', { count: 'exact', head: true })
        .eq('house_id', houseId)
        .eq('status', 'active')

    // Get acceptance counts
    const agreementIds = agreements?.map(a => a.id) || []
    const { data: acceptances } = agreementIds.length > 0
        ? await supabase
            .from('agreement_acceptances')
            .select('agreement_id, user_id')
            .in('agreement_id', agreementIds)
        : { data: [] }

    const acceptancesByAgreement = (acceptances || []).reduce((acc: any, a) => {
        if (!acc[a.agreement_id]) acc[a.agreement_id] = []
        acc[a.agreement_id].push(a.user_id)
        return acc
    }, {})

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-4xl mx-auto py-8 px-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href="/houses" className="hover:text-gray-700">Houses</Link>
                    <span>/</span>
                    <Link href={`/houses/${houseId}`} className="hover:text-gray-700">{house?.city}</Link>
                    <span>/</span>
                    <span className="text-gray-900">Agreements</span>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">House Agreements</h1>
                        <p className="text-gray-600">Shared agreements and rules for your house</p>
                    </div>
                    {isAdmin && (
                        <Link
                            href={`/houses/${houseId}/agreements/create`}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                        >
                            + New Agreement
                        </Link>
                    )}
                </div>

                {/* Agreements List */}
                {!agreements || agreements.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Agreements Yet</h3>
                        <p className="text-gray-500 mb-4">Create your first house agreement to set shared rules</p>
                        {isAdmin && (
                            <Link
                                href={`/houses/${houseId}/agreements/create`}
                                className="inline-flex px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700"
                            >
                                Create Agreement
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {agreements.map((agreement: any) => {
                            const acceptedUsers = acceptancesByAgreement[agreement.id] || []
                            const acceptanceCount = acceptedUsers.length
                            const hasAccepted = acceptedUsers.includes(user.id)
                            const creator = agreement.profiles?.name || 'Unknown'

                            return (
                                <div key={agreement.id} className="bg-white rounded-xl border border-gray-200 p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {agreement.title}
                                                </h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(agreement.status)}`}>
                                                    {agreement.status}
                                                </span>
                                                {agreement.status === 'active' && hasAccepted && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                                        ✓ You accepted
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                Version {agreement.version} · Created by {creator} · {formatDate(agreement.created_at)}
                                            </p>
                                        </div>
                                        
                                        <AgreementActions
                                            agreement={agreement}
                                            isAdmin={isAdmin}
                                            hasAccepted={hasAccepted}
                                            houseId={houseId}
                                        />
                                    </div>

                                    <div className="prose prose-sm max-w-none text-gray-600 mb-4 line-clamp-3">
                                        {agreement.content.substring(0, 300)}
                                        {agreement.content.length > 300 && '...'}
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-4">
                                            {agreement.status === 'active' && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-teal-500 rounded-full"
                                                            style={{ width: `${memberCount ? (acceptanceCount / memberCount) * 100 : 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {acceptanceCount}/{memberCount} accepted
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <Link
                                            href={`/houses/${houseId}/agreements/${agreement.id}`}
                                            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                                        >
                                            View Details →
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
