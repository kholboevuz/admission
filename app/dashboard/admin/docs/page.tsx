import { AddDocs } from '@/components/add-docs'
import { DocsTable } from '@/components/docs-table'
import React from 'react'

export default function page() {
    const columns = []
    const data = []

    return (
        <div>
            <div className='flex justify-between items-center pb-4'>
                <p className='font-bold'>Qabul hujjatlari</p>
                <AddDocs />
            </div>
            <div>
                <DocsTable columns={columns} data={data} />
            </div>
        </div>
    )
}
