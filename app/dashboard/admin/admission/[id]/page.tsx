import { StatsCard } from '@/components/stats-card'
export default function page() {
    return (
        <div>
            <p className='mb-2 font-bold'>
                2026-yil qabulining statistikasi
            </p>
            <hr className='mb-4' />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatsCard title="Umumiy foydalanuvchilar" value="0" className="border-l-green-500" />
                <StatsCard title="Ariza to'ldirganlar" value="0" className="border-l-yellow-500" />
                <StatsCard title="Ochiq tanlovda" value="0" className="border-l-blue-500" />
                <StatsCard title="Buyurtmada" value="0" className="border-l-purple-500" />
                <StatsCard title="Arizasi bekor qilinganlar" value="0" className="border-l-red-500" />
            </div>
        </div>
    )
}
