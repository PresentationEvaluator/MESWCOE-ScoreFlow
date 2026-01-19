import PresentationView from '@/components/PresentationView';

interface PageProps {
    params: {
        id: string;
    };
}

export default function PresentationPage({ params }: PageProps) {
    return <PresentationView presentationId={params.id} />;
}
