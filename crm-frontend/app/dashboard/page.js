'use client'
import RuleBuilder from '../components/RuleBuilder';

export default function DashboardPage() {
    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-gray-800">Campaign Dashboard</h1>
                <p className="text-gray-500">Create a new campaign by defining an audience below.</p>
            </header>
            <RuleBuilder />
            {/* You would add the Campaign History component below this */}
        </main>
    )
}