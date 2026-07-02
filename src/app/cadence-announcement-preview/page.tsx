'use client';

/**
 * TEMP verification route — the cadence §Novedades components: the full
 * "What's new" FeatureAnnouncement (Image #7), the compact AnnouncementCard,
 * and the AnnouncementDot notification row. Safe to delete.
 */

import {
  FeatureAnnouncement,
  FeatureChip,
  AnnouncementCard,
  AnnouncementDot,
} from '@leasefy/cadence';
import { Waveform, ChatCircleDots, Tag } from '@phosphor-icons/react';

export default function CadenceAnnouncementPreviewPage() {
  return (
    <div className="flex min-h-screen flex-wrap items-start justify-center gap-8 bg-surface-muted p-10">
      {/* Full modal — recreation of Image #7 */}
      <FeatureAnnouncement
        appName="Sherlock"
        appInitial="C"
        title="What's new in Cadence v3"
        items={[
          {
            icon: <Waveform />,
            title: 'Our most expressive Text to Speech model',
            description: (
              <>
                Select <FeatureChip>Cadence v3</FeatureChip> as the model
              </>
            ),
          },
          {
            icon: <ChatCircleDots />,
            title: 'Create natural multi-speaker dialogue',
            description: (
              <>
                Click <FeatureChip>+ Add speaker</FeatureChip> to add new speakers
              </>
            ),
          },
          {
            icon: <Tag />,
            title: 'Use audio tags to control delivery',
            description: (
              <>
                Click <FeatureChip>Enhance</FeatureChip> to add tags like{' '}
                <FeatureChip>[laughing]</FeatureChip>
              </>
            ),
          },
        ]}
        ctaLabel="Get started"
      />

      {/* Compact card + dot */}
      <div className="flex w-[300px] max-w-full flex-col gap-[18px]">
        <AnnouncementCard
          tag="Nuevo"
          version="v3.0"
          title="Audio tags"
          description="Controla emoción y entrega con etiquetas en línea como [laughing]."
        />
        <AnnouncementDot
          icon={<Tag />}
          title="1 novedad disponible"
          description="Toca para ver qué cambió"
        />
      </div>
    </div>
  );
}
