import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import Link from 'next/link'
import MemberActions from './MemberActions'

interface MembersPageProps {
    params: Promise<{ id: string }>
}

export default async function MembersPage({ params }: MembersPageProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/auth/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

    // Get house details
    const { data: house, error: houseError } = await supabase
        .from('houses')
        .select('*')
        .eq('id', id)
        .single()

    if (houseError || !house) {
        notFound()
    }

    // Check if user is a member
    const { data: membership } = await supabase
        .from('house_members')
        .select('role')
        .eq('house_id', id)
        .eq('user_id', user.id)
        .single()

    if (!membership) {
        redirect('/houses')
    }

    const isAdmin = membership.role === 'admin'

    // Get all members with their profiles
    const { data: members } = await supabase
        .from('house_members')
        .select(`
            user_id,
            role,
            status,
            created_at,
            profiles (
                name,
                occupation,
                avatar,
                bio
            ),
            users (
                email
            )
        `)
        .eq('house_id', id)
        .order('created_at', { ascending: true })

    const activeMembers = members?.filter(m => m.status === 'active') || []

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || 'User'} />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumb */}
                <nav className="mb-6">
                    <ol className="flex items-center space-x-2 text-sm text-gray-500">
                        <li><Link href="/houses" className="hover:text-gray-700">Houses</Link></li>
                        <li>/</li>
                        <li><Link href={`/houses/${id}`} className="hover:text-gray-700">{house.city || 'Dashboard'}</Link></li>
                        <li>/</li>
                        <li className="text-gray-900">Members</li>
                    </ol>
                </nav>

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">House Members</h1>
                        <p className="text-gray-600 mt-1">
                            {activeMembers.length} of {house.target_members} members
                        </p>
                    </div>
                    {isAdmin && (
                        <Link
                            href={`/houses/${id}`}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Invite Members
                        </Link>
                    )}
                </div>

                {/* Members List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                        {activeMembers.map((member) => {
                            const memberProfile = member.profiles as { name?: string; occupation?: string; avatar?: string; bio?: string } | null
                            const memberUser = member.users as { email?: string } | null
                            const isCurrentUser = member.user_id === user.id

                            return (
                                <li key={member.user_id} className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            {/* Avatar */}
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                                                {memberProfile?.avatar ? (
                                                    <img
                                                        src={memberProfile.avatar}
                                                        alt={memberProfile.name || 'Member'}
                                                        className="w-12 h-12 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    (memberProfile?.name || memberUser?.email || 'U')[0].toUpperCase()
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <h3 className="font-medium text-gray-900">
                                                        {memberProfile?.name || memberUser?.email || 'Unknown'}
                                                    </h3>
                                                    {isCurrentUser && (
                                                        <span className="text-xs text-gray-500">(you)</span>
                                                    )}
                                                </div>
                                                {memberProfile?.occupation && (
                                                    <p className="text-sm text-gray-500">{memberProfile.occupation}</p>
                                                )}
                                                {memberUser?.email && (
                                                    <p className="text-xs text-gray-400">{memberUser.email}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Role Badge & Actions */}
                                        <div className="flex items-center space-x-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                member.role === 'admin'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {member.role === 'admin' ? 'Admin' : 'Member'}
                                            </span>

                                            {isAdmin && !isCurrentUser && (
                                                <MemberActions
                                                    memberId={member.user_id}
                                                    houseId={id}
                                                    currentRole={member.role}
                                                    memberName={memberProfile?.name || 'this member'}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Bio if available */}
                                    {memberProfile?.bio && (
                                        <p className="mt-3 text-sm text-gray-600 ml-16">
                                            {memberProfile.bio}
                                        </p>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </div>

                {/* Empty State */}
                {activeMembers.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No members yet.</p>
                    </div>
                )}
            </main>
        </div>
    )
}
