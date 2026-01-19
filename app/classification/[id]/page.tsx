import ClassificationView from '@/components/ClassificationView';

interface PageProps {
    params: {
        id: string;
    };
}

export default function ClassificationPage({ params }: PageProps) {
    return <ClassificationView presentationId={params.id} />;
}
