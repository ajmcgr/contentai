
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

interface Review {
  id: number;
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
}

const reviews: Review[] = [
  {
    id: 1,
    name: "Sarah Thompson",
    role: "Marketing Director",
    avatar: "/placeholder.svg",
    content: "This AI scheduling assistant has completely transformed how we manage our social media. The time savings are incredible!",
    rating: 5
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Content Creator",
    avatar: "/placeholder.svg",
    content: "The AI suggestions are spot-on and have helped me maintain consistency across all my social platforms. Highly recommended!",
    rating: 5
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "Social Media Manager",
    avatar: "/placeholder.svg",
    content: "Finally, a tool that understands the nuances of different social platforms. It's like having an expert team member.",
    rating: 5
  }
];

export const Reviews = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-4xl font-reckless font-medium text-center mb-12">
          Loved by Busy Founders
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review) => (
            <Card key={review.id} className="bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-6">{review.content}</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <img
                      src={review.avatar}
                      alt={review.name}
                      className="object-cover"
                    />
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {review.name}
                    </h4>
                    <p className="text-sm text-gray-500">{review.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
