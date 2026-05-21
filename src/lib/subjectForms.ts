import Public from '@/components/subjectForms/Public.vue'
import WebId from '@/components/subjectForms/WebId.vue'
import { defineComponent, type Component } from 'vue'

export interface SubjectFormComponent {
    create: () => Promise<boolean>,
}

const placeholder = defineComponent({
    expose: ["create"],
    setup() {
        const create = async (): Promise<boolean> => true
        return { create }
    }
})

export const subjectForms: Record<string, Component> = {
    webId: WebId,
    public: Public
}
