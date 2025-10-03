"use client";

interface ContactInfoProps {
  technician: {
    businessPhone?: string;
    phone?: string;
    businessEmail?: string;
    email?: string;
    website?: string;
    businessAddress?: string;
    hourlyRate?: string;
    serviceArea?: string;
  };
}

export function ContactInfo({ technician }: ContactInfoProps) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        Contact Information
      </h3>
      
      <div className="space-y-4">
        {/* Business Phone */}
        {technician.businessPhone && (
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
            <div className="w-8 h-8 bg-green-500/30 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-slate-400">Business Phone</div>
              <a href={`tel:${technician.businessPhone}`} className="text-white hover:text-green-300 transition-colors font-medium">
                {technician.businessPhone}
              </a>
            </div>
          </div>
        )}

        {/* Business Email */}
        {technician.businessEmail && (
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
            <div className="w-8 h-8 bg-purple-500/30 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-slate-400">Business Email</div>
              <a href={`mailto:${technician.businessEmail}`} className="text-white hover:text-purple-300 transition-colors font-medium break-all">
                {technician.businessEmail}
              </a>
            </div>
          </div>
        )}

        {/* Website */}
        {technician.website && (
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
            <div className="w-8 h-8 bg-orange-500/30 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-slate-400">Website</div>
              <a href={technician.website} target="_blank" rel="noopener noreferrer" className="text-white hover:text-orange-300 transition-colors font-medium break-all">
                Visit Website
              </a>
            </div>
          </div>
        )}

        {/* Business Address */}
        {technician.businessAddress && (
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
            <div className="w-8 h-8 bg-red-500/30 rounded-lg flex items-center justify-center mt-0.5">
              <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-slate-400">Business Address</div>
              <address className="text-white not-italic leading-relaxed">
                {technician.businessAddress}
              </address>
            </div>
          </div>
        )}
      </div>

      {/* Service Details */}
      {(technician.hourlyRate || technician.serviceArea) && (
        <div className="mt-6 pt-4 border-t border-white/20">
          <h4 className="text-md font-semibold text-white mb-3">Service Details</h4>
          <div className="space-y-3">
            {technician.hourlyRate && (
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Rate:
                </span>
                <span className="text-white font-semibold">{technician.hourlyRate}</span>
              </div>
            )}
            
            {technician.serviceArea && (
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Service Area:
                </span>
                <span className="text-white font-semibold">{technician.serviceArea}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}