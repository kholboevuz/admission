'use client';
import ProfileTabsCard from "@/components/profile-tabs-card";
import React from "react";

export default function Page() {
    return (
        <div className="">
            <ProfileTabsCard
                data={{
                    avatarUrl: "/assets/avatar.png",
                    fioTitle: "XOLBOYEV\nSEVINCHBEK NURBEK\nO'G'LI",
                    passport: {
                        fullName: "XOLBOYEV SEVINCHBEK NURBEK O'G'LI",
                        birthDate: "04.04.2004",
                        passportSeriesNumber: "AC2500222",
                        pinfl: "50404045650036",
                        issueDate: "03.12.2019",
                        expiryDate: "02.12.2029",
                        issuedBy: "QASHQADARYO VILOYATI QARSHI TUMANI IIB",
                    },
                    address: {
                        country: "O‘ZBEKISTON",
                        region: "QASHQADARYO VILOYATI",
                        district: "QARSHI TUMANI",
                        addressLine: "… (to‘liq manzil)",
                    },
                    contacts: { phone: null, extraPhone: null, email: null },
                    work: [],
                    education: [],
                }}
                onRefresh={() => console.log("refresh")}
            />
        </div>
    );
}
