import React from 'react';
import './Process.css';
 
const Process: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Consultation',
      description: 'Meet with our master goldsmiths to discuss your vision and preferences.'
    },
    {
      number: '02',
      title: 'Design',
      description: 'Our designers create custom sketches and 3D models based on your specifications.'
    },
    {
      number: '03',
      title: 'Stone Selection',
      description: 'Choose from our collection of certified precious stones, each with its unique story.'
    },
    {
      number: '04',
      title: 'Crafting',
      description: 'Watch your ring take shape through our traditional handcrafting techniques.'
    },
    {
      number: '05',
      title: 'Final Polish',
      description: 'Quality inspection and final polishing to ensure perfection in every detail.'
    }
  ];
 
  return (
    <section id="process" className="process">
      <div className="container">
        <h2 className="section-title">Our Creation Process</h2>
        <div className="process-timeline">
          {steps.map((step, index) => (
            <div key={index} className={`process-step ${index % 2 === 0 ? 'left' : 'right'}`}>
              <div className="step-number">{step.number}</div>
              <div className="step-content">
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
 
export default Process;
 