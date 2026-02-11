'use client'
import SubmissionClosed from '@/components/no-accept-application'
import { StepperForm } from '@/components/step-form'
import { axiosClient } from '@/http/axios'
import { Loader2 } from 'lucide-react'
import React from 'react'

export default function page() {
    interface StatusAdmission {
        status: boolean
    }
    const [isStatus, setIsStatus] = React.useState<StatusAdmission>()
    const [isLoading, setIsLoading] = React.useState(true)
    const getStatusAdmission = async () => {
        try {
            const response = await axiosClient.get('/user/application/status')
            setIsStatus(response.data.data.status)
            setIsLoading(false)
        } catch (error) {
            console.error('Error fetching status admission:', error)
            setIsLoading(false)
        }
    }

    React.useEffect(() => {
        getStatusAdmission()
    }, [])
    if (isLoading) {
        return <>
            <div className='flex justify-center items-center'>
                <Loader2 className='animate-spin' />
            </div>
        </>
    }
    if (!isStatus) {
        return <SubmissionClosed />
    }
    return (
        <StepperForm />
    )

}
