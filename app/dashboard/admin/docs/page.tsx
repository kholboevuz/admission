import { AddDocs } from '@/components/add-docs'


export default function page() {
    return (
        <div>
            <div className='flex justify-between items-center pb-4'>
                <p className='font-bold'>Qabul hujjatlari</p>
                <AddDocs />
            </div>
            <div>
                {/* <DocsTable columns={columns} data={data} /> */}
            </div>
        </div>
    )
}
