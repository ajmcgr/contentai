import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Edit, Trash2, Eye, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Sample data - this would come from your API/database
const sampleArticles = [
  {
    id: 1,
    title: "10 Best SEO Practices for 2024",
    author: "AI Writer",
    createdOn: "2024-01-15",
    status: "published",
    category: "SEO"
  },
  {
    id: 2,
    title: "How to Increase Blog Traffic",
    author: "AI Writer", 
    createdOn: "2024-01-14",
    status: "draft",
    category: "Marketing"
  },
  {
    id: 3,
    title: "Content Marketing Strategy Guide",
    author: "AI Writer",
    createdOn: "2024-01-13", 
    status: "scheduled",
    category: "Content"
  },
  {
    id: 4,
    title: "Social Media Optimization Tips",
    author: "AI Writer",
    createdOn: "2024-01-12",
    status: "generated",
    category: "Social Media"
  }
];

const getStatusBadge = (status: string) => {
  const variants = {
    published: "default",
    draft: "secondary", 
    scheduled: "outline",
    generated: "destructive"
  } as const;
  
  return (
    <Badge variant={variants[status as keyof typeof variants] || "secondary"} className="capitalize">
      {status}
    </Badge>
  );
};

export function ArticleManagement() {
  const [activeTab, setActiveTab] = useState("all");

  const filteredArticles = activeTab === "all" 
    ? sampleArticles 
    : sampleArticles.filter(article => article.status === activeTab);

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-reckless font-medium text-foreground">Articles</h1>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Write Article
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-none lg:inline-flex">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="generated">Generated</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="border border-border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Post</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Created on</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No articles found for this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredArticles.map((article) => (
                      <TableRow key={article.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold text-foreground">{article.title}</div>
                            <div className="text-sm text-muted-foreground">{article.category}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{article.author}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(article.createdOn).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(article.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}