import Image from 'next/image'
import React from 'react'
import { Button } from './ui/button'
import { useTranslations } from 'next-intl';

export default function OneIDForm() {
    const t = useTranslations('LoginPage');
    return (
        <div>
            <Image src={'/logo/oneId.png'} alt={'OneID'} width={200} height={50} className="mx-auto" />
            <Button className="w-full">{t("buttton-login")}</Button>
        </div>
    )
}
