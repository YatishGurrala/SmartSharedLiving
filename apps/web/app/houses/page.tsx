import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '../components/Navbar'
import Link from 'next/link'

export default async function HousesPage() {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/auth/login')
    }

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

    // Get houses where user is a member with member counts
    const { data: memberships } = await supabase
        .from('house_members')
        .select(`
            house_id,
            role,
            houses (
                id,
                city,
                target_members,
                status,
                created_at,
                created_by
            )
        `)
        .eq('user_id', user.id)

    // Get member counts for each house
    const houseIds = memberships?.map(m => (m.houses as any)?.id).filter(Boolean) || []
    const { data: memberCounts } = houseIds.length > 0 
        ? await supabase
            .from('house_members')
            .select('house_id')
            .in('house_id', houseIds)
        : { data: [] }

    const countsByHouse = (memberCounts || []).reduce((acc: Record<string, number>, m: any) => {
        acc[m.house_id] = (acc[m.house_id] || 0) + 1
        return acc
    }, {})

    const houses = memberships?.map(m => ({
        ...m.houses,
        role: m.role,
        memberCount: countsByHouse[(m.houses as any)?.id] || 0
    })) || []

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">My Houses</h1>
                            <p className="text-teal-100 max-w-xl">
                                Manage your shared living groups. Collaborate with your housemates, 
                                invite new members, and organize your ideal living arrangement.
                            </p>
                        </div>
                        <Link
                            href="/houses/create"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-700 rounded-xl font-semibold hover:bg-teal-50 transition-colors shadow-lg"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create House
                        </Link>
                    </div>
                </div>

                {/* Stats Summary */}
                {houses.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <div className="text-2xl font-bold text-gray-900">{houses.length}</div>
                            <div className="text-sm text-gray-500">Total Houses</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <div className="text-2xl font-bold text-green-600">{houses.filter((h: any) => h.status === 'active').length}</div>
                            <div className="text-sm text-gray-500">Active</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <div className="text-2xl font-bold text-indigo-600">{houses.filter((h: any) => h.role === 'admin').length}</div>
                            <div className="text-sm text-gray-500">Admin Roles</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <div className="text-2xl font-bold text-teal-600">{houses.reduce((sum: number, h: any) => sum + (h.memberCount || 0), 0)}</div>
                            <div className="text-sm text-gray-500">Total Members</div>
                        </div>
                    </div>
                )}

                {houses.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">No houses yet</h3>
                            <p className="text-gray-500 mb-8">
                                Create a house to start building your shared living group. 
                                Invite potential roommates and coordinate your housing search together.
                            </p>
                            <Link
                                href="/houses/create"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Your First House
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {houses.map((house: any) => (
                            <Link
                                key={house.id}
                                href={`/houses/${house.id}`}
                                className="group bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-lg hover:border-teal-200 transition-all duration-300"
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">{house.city}</h3>
                                            <span className={`inline-block mt-0.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                                                house.status === 'active' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {house.status}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                        house.role === 'admin' 
                                            ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200' 
                                            : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {house.role === 'admin' ? '👑 Admin' : 'Member'}
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-500">Members</span>
                                        <span className="font-medium text-gray-900">{house.memberCount} / {house.target_members}</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-300"
                                            style={{ width: `${Math.min((house.memberCount / house.target_members) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <span className="text-sm text-gray-500">
                                        Created {new Date(house.created_at).toLocaleDateString()}
                                    </span>
                                    <span className="text-sm text-teal-600 font-medium group-hover:translate-x-1 transition-transform">
                                        View Details →
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
