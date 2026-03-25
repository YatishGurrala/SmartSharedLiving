import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import NoticeActions from './NoticeActions'

interface NoticesPageProps {
    params: Promise<{ id: string }>
}

export default async function NoticesPage({ params }: NoticesPageProps) {
    const { id: houseId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/auth/login')
    }

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

    // Check membership
    const { data: membership } = await supabase
        .from('house_members')
        .select('role')
        .eq('house_id', houseId)
        .eq('user_id', user.id)
        .single()

    if (!membership) {
        redirect('/houses')
    }

    const isAdmin = membership.role === 'admin'

    // Get house info
    const { data: house } = await supabase
        .from('houses')
        .select('name')
        .eq('id', houseId)
        .single()

    // Get notices with creator info and acknowledgements
    const { data: notices } = await supabase
        .from('notices')
        .select(`
            *,
            creator_profile:profiles!notices_created_by_fkey(full_name),
            acknowledgements:notice_acknowledgements(user_id)
        `)
        .eq('house_id', houseId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

    // Get house member count for acknowledgement tracking
    const { count: memberCount } = await supabase
        .from('house_members')
        .select('*', { count: 'exact', head: true })
        .eq('house_id', houseId)

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })
    }

    const hasUserAcknowledged = (notice: { acknowledgements: { user_id: string }[] }) => {
        return notice.acknowledgements?.some(ack => ack.user_id === user.id)
    }

    const pinnedNotices = notices?.filter(n => n.is_pinned) || []
    const regularNotices = notices?.filter(n => !n.is_pinned) || []

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />
            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <Link href={`/houses/${houseId}`} className="text-blue-600 hover:underline text-sm">
                            &larr; Back to {house?.name || 'House'}
                        </Link>
                        <h1 className="text-2xl font-bold mt-2">Notices</h1>
                    </div>
                    {isAdmin && (
                        <Link
                            href={`/houses/${houseId}/notices/create`}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Post Notice
                        </Link>
                    )}
                </div>

                {/* Unacknowledged notices warning */}
                {notices?.some(n => n.requires_acknowledgement && !hasUserAcknowledged(n)) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <p className="text-yellow-800">
                            ⚠️ You have notices that require your acknowledgement
                        </p>
                    </div>
                )}

                {notices?.length === 0 ? (
                    <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
                        No notices yet. {isAdmin ? 'Post one to keep your housemates informed!' : ''}
                    </div>
                ) : (
                    <>
                        {/* Pinned Notices */}
                        {pinnedNotices.length > 0 && (
                            <section className="mb-8">
                                <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">📌 Pinned</h2>
                                <div className="space-y-4">
                                    {pinnedNotices.map((notice) => (
                                        <NoticeCard
                                            key={notice.id}
                                            notice={notice}
                                            houseId={houseId}
                                            isAdmin={isAdmin}
                                            currentUserId={user.id}
                                            memberCount={memberCount || 0}
                                            hasAcknowledged={hasUserAcknowledged(notice)}
                                            formatDate={formatDate}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Regular Notices */}
                        {regularNotices.length > 0 && (
                            <section>
                                <h2 className="text-sm font-medium text-gray-500 uppercase mb-3">Recent</h2>
                                <div className="space-y-4">
                                    {regularNotices.map((notice) => (
                                        <NoticeCard
                                            key={notice.id}
                                            notice={notice}
                                            houseId={houseId}
                                            isAdmin={isAdmin}
                                            currentUserId={user.id}
                                            memberCount={memberCount || 0}
                                            hasAcknowledged={hasUserAcknowledged(notice)}
                                            formatDate={formatDate}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}

interface NoticeCardProps {
    notice: {
        id: string
        title: string
        content: string
        is_pinned: boolean
        requires_acknowledgement: boolean
        created_at: string
        creator_profile: { full_name: string } | null
        acknowledgements: { user_id: string }[]
    }
    houseId: string
    isAdmin: boolean
    currentUserId: string
    memberCount: number
    hasAcknowledged: boolean
    formatDate: (date: string) => string
}

function NoticeCard({
    notice,
    houseId,
    isAdmin,
    currentUserId,
    memberCount,
    hasAcknowledged,
    formatDate
}: NoticeCardProps) {
    const ackCount = notice.acknowledgements?.length || 0

    return (
        <div className={`bg-white p-5 rounded-lg shadow-sm border ${
            notice.requires_acknowledgement && !hasAcknowledged
                ? 'border-yellow-300 bg-yellow-50'
                : 'border-gray-100'
        }`}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{notice.title}</h3>
                        {notice.is_pinned && <span className="text-sm">📌</span>}
                    </div>
                    <p className="text-gray-700 mt-2 whitespace-pre-wrap">{notice.content}</p>
                    <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
                        <span>Posted by {notice.creator_profile?.full_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{formatDate(notice.created_at)}</span>
                        {notice.requires_acknowledgement && (
                            <>
                                <span>•</span>
                                <span className={ackCount === memberCount ? 'text-green-600' : 'text-yellow-600'}>
                                    {ackCount}/{memberCount} acknowledged
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <NoticeActions
                    notice={notice}
                    houseId={houseId}
                    isAdmin={isAdmin}
                    hasAcknowledged={hasAcknowledged}
                />
            </div>
        </div>
    )
}
