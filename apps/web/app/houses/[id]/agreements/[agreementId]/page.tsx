import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { getStatusColor, formatDate, getInitials } from '@/lib/utils'
import AgreementDetailActions from './AgreementDetailActions'

interface AgreementDetailPageProps {
    params: Promise<{ id: string; agreementId: string }>
}

export default async function AgreementDetailPage({ params }: AgreementDetailPageProps) {
    const { id: houseId, agreementId } = await params
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

    // Get profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

    // Get agreement
    const { data: agreement } = await supabase
        .from('agreements')
        .select(`
            *,
            creator:created_by (
                name,
                avatar
            )
        `)
        .eq('id', agreementId)
        .single()

    if (!agreement) redirect(`/houses/${houseId}/agreements`)

    // Get house members
    const { data: members } = await supabase
        .from('house_members')
        .select(`
            user_id,
            role,
            profiles:user_id (
                name,
                avatar
            )
        `)
        .eq('house_id', houseId)
        .eq('status', 'active')

    // Get acceptances
    const { data: acceptances } = await supabase
        .from('agreement_acceptances')
        .select(`
            user_id,
            accepted_at,
            profiles:user_id (
                name,
                avatar
            )
        `)
        .eq('agreement_id', agreementId)

    const acceptedUserIds = new Set((acceptances || []).map(a => a.user_id))
    const hasAccepted = acceptedUserIds.has(user.id)

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-4xl mx-auto py-8 px-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href="/houses" className="hover:text-gray-700">Houses</Link>
                    <span>/</span>
                    <Link href={`/houses/${houseId}`} className="hover:text-gray-700">House</Link>
                    <span>/</span>
                    <Link href={`/houses/${houseId}/agreements`} className="hover:text-gray-700">Agreements</Link>
                    <span>/</span>
                    <span className="text-gray-900">{agreement.title}</span>
                </div>

                {/* Agreement Header */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-gray-900">{agreement.title}</h1>
                                <span className={`text-sm px-2.5 py-0.5 rounded-full ${getStatusColor(agreement.status)}`}>
                                    {agreement.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>Version {agreement.version}</span>
                                <span>·</span>
                                <span>Created by {(agreement.creator as any)?.name || 'Unknown'}</span>
                                <span>·</span>
                                <span>{formatDate(agreement.created_at)}</span>
                            </div>
                        </div>

                        <AgreementDetailActions
                            agreement={agreement}
                            isAdmin={isAdmin}
                            hasAccepted={hasAccepted}
                            houseId={houseId}
                        />
                    </div>

                    {agreement.status === 'active' && !hasAccepted && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                            <p className="text-yellow-800">
                                <strong>Action Required:</strong> Please read and accept this agreement to confirm you understand and agree to the house rules.
                            </p>
                        </div>
                    )}
                </div>

                {/* Agreement Content */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Agreement Content</h2>
                    <div className="prose prose-gray max-w-none whitespace-pre-wrap text-gray-700">
                        {agreement.content}
                    </div>
                </div>

                {/* Acceptance Status */}
                {agreement.status === 'active' && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Acceptance Status ({acceptances?.length || 0}/{members?.length || 0})
                        </h2>
                        
                        <div className="space-y-3">
                            {members?.map((member: any) => {
                                const acceptance = acceptances?.find(a => a.user_id === member.user_id)
                                const isAccepted = !!acceptance
                                const memberProfile = member.profiles

                                return (
                                    <div key={member.user_id} className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                                                {memberProfile?.avatar ? (
                                                    <img src={memberProfile.avatar} alt="" className="w-10 h-10 rounded-full" />
                                                ) : (
                                                    getInitials(memberProfile?.name)
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {memberProfile?.name || 'Unknown'}
                                                    {member.user_id === user.id && ' (You)'}
                                                </p>
                                                <p className="text-sm text-gray-500">{member.role}</p>
                                            </div>
                                        </div>
                                        <div>
                                            {isAccepted ? (
                                                <div className="flex items-center gap-2 text-green-600">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span className="text-sm">Accepted {formatDate(acceptance.accepted_at)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                                    Pending
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
