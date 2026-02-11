'use client'
import { AdmissionTable } from '@/components/admission-table'
export default function page() {

    return (
        <div>
            <div className='flex items-center gap-2 justify-between mb-4'>
                <p className="font-bold">Yangi qabul ochish</p>

            </div>
            <AdmissionTable add={true} />
        </div>
    )
}
