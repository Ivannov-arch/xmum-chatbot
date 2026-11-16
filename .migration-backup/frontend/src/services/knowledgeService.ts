import { supabase } from "@/lib/supabaseClient";

export async function getKnowledgeItems() {
    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;
    
    while (true) {
        const { data, error } = await supabase
            .from('knowledge_items')
            .select('id, module, question, answer, keywords')
            .order('module', { ascending: true })
            .range(from, from + batchSize - 1);
        
        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allData = allData.concat(data);
        if (data.length < batchSize) break;
        from += batchSize;
    }

    return allData;
}

export async function createKnowledgeItem({module, question, answer, keywordsArray}: {module:string, question:string, answer:string, keywordsArray:string[]}) {
    const { data, error } = await supabase
        .from('knowledge_items')
        .insert([{ module, question, answer, keywords: keywordsArray}])
        .select()

    if (error) throw error
    return data
}

export async function updateKnowledgeItem({id, module, question, answer, keywordsArray}: { id:string, module:string, question:string, answer:string, keywordsArray:string[]}) {
    const { data, error } = await supabase
    .from('knowledge_items')
    .update({ module, question, answer, keywords: keywordsArray })
    .eq('id', id)
    .select()

    if(error) throw error
    return data[0]
}

export async function deleteKnowlegeItem(id: string) {
    const { error } = await supabase
    .from('knowledge_items')
    .delete()
    .eq('id', id)
    
    if(error) throw error
    return true;
}