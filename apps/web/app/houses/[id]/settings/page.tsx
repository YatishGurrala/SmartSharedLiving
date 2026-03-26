import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import Link from 'next/link'
import SettingsForm from './SettingsForm'
import DangerZone from './DangerZone'

interface SettingsPageProps {
    params: Promise<{ id: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
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
    const isCreator = house.created_by === user.id

    // Get member count
    const { count: memberCount } = await supabase
        .from('house_members')
        .select('*', { count: 'exact', head: true })
        .eq('house_id', id)

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || 'User'} />

            <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumb */}
                <nav className="mb-6">
                    <ol className="flex items-center space-x-2 text-sm text-gray-500">
                        <li><Link href="/houses" className="hover:text-gray-700">Houses</Link></li>
                        <li>/</li>
                        <li><Link href={`/houses/${id}`} className="hover:text-gray-700">{house.city || 'Dashboard'}</Link></li>
                        <li>/</li>
                        <li className="text-gray-900">Settings</li>
                    </ol>
                </nav>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">House Settings</h1>
                    <p className="text-gray-600 mt-1">Manage your house preferences</p>
                </div>

                {/* House Info Section */}
                {isAdmin ? (
                    <SettingsForm house={house} />
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">House Information</h2>
                        <dl className="space-y-4">
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Name</dt>
                                <dd className="mt-1 text-gray-900">{house.name || 'Not set'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">City</dt>
                                <dd className="mt-1 text-gray-900">{house.city}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Target Members</dt>
                                <dd className="mt-1 text-gray-900">{house.target_members}</dd>
                            </div>
                            {house.description && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                                    <dd className="mt-1 text-gray-900">{house.description}</dd>
                                </div>
                            )}
                        </dl>
                        <p className="mt-4 text-sm text-gray-500">
                            Only admins can edit house settings.
                        </p>
                    </div>
                )}

                {/* Your Role */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Role</h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-900">
                                You are {membership.role === 'admin' ? 'an' : 'a'}{' '}
                                <span className={`font-medium ${membership.role === 'admin' ? 'text-purple-600' : 'text-gray-700'}`}>
                                    {membership.role}
                                </span>
                            </p>
                            {isCreator && (
                                <p className="text-sm text-gray-500 mt-1">You created this house</p>
                            )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            membership.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}>
                            {membership.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                    </div>
                </div>

                {/* Danger Zone */}
                <DangerZone
                    houseId={id}
                    isAdmin={isAdmin}
                    isCreator={isCreator}
                    memberCount={memberCount || 0}
                />
            </main>
        </div>
    )
}
